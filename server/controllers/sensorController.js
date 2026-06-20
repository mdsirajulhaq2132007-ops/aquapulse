const WaterSource = require('../models/WaterSource');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const { classify } = require('../services/safetyClassifier');

// POST /api/sensors/ingest — called by ESP32
const ingestReading = async (req, res) => {
  try {
    const { deviceId, ph, turbidity, temperature: tempInput } = req.body;

    if (!deviceId || ph === undefined || turbidity === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields: deviceId, ph, turbidity' });
    }

    const temperature = tempInput !== undefined ? tempInput : 25.0;

    // Find water source by deviceId
    const source = await WaterSource.findOne({ deviceId }).populate('village');
    if (!source) {
      return res.status(404).json({ success: false, message: `No water source found for deviceId: ${deviceId}` });
    }

    // Classify the reading
    const { status, flags, alertDefs } = classify({ ph, turbidity, temperature });

    // Save reading
    const task5Status = (ph >= 6.0 && ph <= 8.0) ? 'SAFE' : 'UNSAFE';
    const reading = await SensorReading.create({
      sourceId: source._id,
      villageId: source.village._id,
      status: task5Status,
      waterSource: source._id,
      village: source.village._id,
      deviceId,
      ph,
      turbidity,
      temperature,
      safetyStatus: status,
      flags,
      rawPayload: req.body,
      timestamp: new Date(),
    });

    // Update water source last reading
    await WaterSource.findByIdAndUpdate(source._id, {
      lastReading: reading.timestamp,
      safetyStatus: status,
      lastReadingValues: { ph, turbidity, temperature },
    });

    // Create alerts if needed
    const createdAlerts = [];
    for (const alertDef of alertDefs) {
      const alert = await Alert.create({
        ...alertDef,
        waterSource: source._id,
        village: source.village._id,
      });
      createdAlerts.push(alert);
    }

    // Emit via Socket.IO
    try {
      const io = require('../config/socket').getIO();
      const payload = {
        sourceId: source._id,
        sourceName: source.name,
        villageId: source.village._id,
        reading: { ph, turbidity, temperature, safetyStatus: status, flags, timestamp: reading.timestamp },
      };
      io.to(`source:${source._id}`).emit('sensor:update', payload);
      io.to(`village:${source.village._id}`).emit('sensor:update', payload);
      io.emit('sensor:global', payload); // broadcast for dashboard overview

      // Broadcast updated stats for real-time dashboard cards
      const [totalSources, safeSources, warningSources, unsafeSources, unresolvedAlerts] = await Promise.all([
        require('../models/WaterSource').countDocuments({ status: 'active' }),
        require('../models/WaterSource').countDocuments({ safetyStatus: 'safe' }),
        require('../models/WaterSource').countDocuments({ safetyStatus: 'warning' }),
        require('../models/WaterSource').countDocuments({ safetyStatus: 'unsafe' }),
        require('../models/Alert').countDocuments({ acknowledged: false }),
      ]);
      io.emit('stats:update', { totalSources, safeSources, warningSources, unsafeSources, unresolvedAlerts });

      for (const alert of createdAlerts) {
        const alertPayload = { ...alert.toObject(), sourceName: source.name, villageName: source.village.name };
        io.to(`village:${source.village._id}`).emit('alert:new', alertPayload);
        io.emit('alert:global', alertPayload);
      }
    } catch (_) {}


    res.status(201).json({
      success: true,
      message: 'Reading ingested successfully',
      data: { readingId: reading._id, status, flags, alertsCreated: createdAlerts.length },
    });
  } catch (error) {
    console.error('Ingest error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/sensors/:sourceId/latest
const getLatestReading = async (req, res) => {
  try {
    const reading = await SensorReading.findOne({ waterSource: req.params.sourceId })
      .sort({ timestamp: -1 });
    res.json({ success: true, data: reading });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/sensors/:sourceId/history
const getHistory = async (req, res) => {
  try {
    const { sourceId } = req.params;
    const { start, end, limit = 100 } = req.query;

    const filter = { waterSource: sourceId };
    if (start || end) {
      filter.timestamp = {};
      if (start) filter.timestamp.$gte = new Date(start);
      if (end) filter.timestamp.$lte = new Date(end);
    }

    const readings = await SensorReading.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, data: readings.reverse() }); // chronological order
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/sensors/readings — list all readings (paginated)
const getReadings = async (req, res) => {
  try {
    const { sourceId, villageId, status, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (sourceId)  filter.waterSource = sourceId;
    if (villageId) filter.village = villageId;
    if (status)    filter.safetyStatus = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [readings, total] = await Promise.all([
      SensorReading.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('waterSource', 'name type deviceId')
        .populate('village', 'name district'),
      SensorReading.countDocuments(filter),
    ]);

    res.json({ success: true, data: readings, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/sensors/latest-per-source — one latest reading per active source
const getLatestPerSource = async (req, res) => {
  try {
    const latest = await WaterSource.aggregate([
      { $match: { status: 'active' } },
      {
        $lookup: {
          from: 'sensor_readings',
          let: { srcId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$waterSource', '$$srcId'] } } },
            { $sort: { timestamp: -1 } },
            { $limit: 1 }
          ],
          as: 'latestReading'
        }
      },
      {
        $addFields: {
          reading: { $arrayElemAt: ['$latestReading', 0] }
        }
      },
      {
        $lookup: {
          from: 'villages',
          localField: 'village',
          foreignField: '_id',
          as: 'villageDoc'
        }
      },
      {
        $addFields: {
          villageDoc: { $arrayElemAt: ['$villageDoc', 0] }
        }
      },
      {
        $project: {
          waterSource: '$_id',
          sourceName: '$name',
          sourceType: '$type',
          deviceId: '$deviceId',
          villageName: '$villageDoc.name',
          villageDistrict: '$villageDoc.district',
          ph: '$reading.ph',
          turbidity: '$reading.turbidity',
          temperature: '$reading.temperature',
          safetyStatus: { $ifNull: ['$reading.safetyStatus', 'unknown'] },
          timestamp: '$reading.timestamp'
        }
      },
      { $sort: { timestamp: -1 } }
    ]);

    res.json({ success: true, data: latest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { ingestReading, getLatestReading, getHistory, getReadings, getLatestPerSource };

