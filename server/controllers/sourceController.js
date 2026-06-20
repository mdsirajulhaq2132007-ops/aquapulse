const WaterSource = require('../models/WaterSource');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');

const getSources = async (req, res) => {
  try {
    const filter = {};
    if (req.query.village) filter.village = req.query.village;
    if (req.query.status) filter.status = req.query.status;

    const sources = await WaterSource.find(filter)
      .populate('village', 'name district')
      .populate('createdBy', 'name');
    res.json({ success: true, data: sources });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSource = async (req, res) => {
  try {
    const source = await WaterSource.findById(req.params.id)
      .populate('village', 'name district state')
      .populate('createdBy', 'name');
    if (!source) return res.status(404).json({ success: false, message: 'Water source not found' });
    res.json({ success: true, data: source });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSource = async (req, res) => {
  try {
    const source = await WaterSource.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: source });
  } catch (error) {
    console.error('Error in createSource:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSource = async (req, res) => {
  try {
    const source = await WaterSource.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!source) return res.status(404).json({ success: false, message: 'Water source not found' });
    res.json({ success: true, data: source });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSource = async (req, res) => {
  try {
    const sourceId = req.params.id;
    const source = await WaterSource.findByIdAndDelete(sourceId);
    if (!source) return res.status(404).json({ success: false, message: 'Water source not found' });

    // Cascade delete related sensor readings and alerts
    await Promise.all([
      SensorReading.deleteMany({ waterSource: sourceId }),
      Alert.deleteMany({ waterSource: sourceId })
    ]);

    // Emit Socket.IO event to update frontend dashboard stats in real-time
    try {
      const io = require('../config/socket').getIO();
      const [totalSources, safeSources, warningSources, unsafeSources, unresolvedAlerts] = await Promise.all([
        WaterSource.countDocuments({ status: 'active' }),
        WaterSource.countDocuments({ safetyStatus: 'safe' }),
        WaterSource.countDocuments({ safetyStatus: 'warning' }),
        WaterSource.countDocuments({ safetyStatus: 'unsafe' }),
        Alert.countDocuments({ acknowledged: false }),
      ]);
      io.emit('stats:update', { totalSources, safeSources, warningSources, unsafeSources, unresolvedAlerts });
    } catch (_) {}

    res.json({ success: true, message: 'Water source and all associated readings and alerts deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSourceStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { range = '7d' } = req.query;

    const rangeMap = { '24h': 1, '7d': 7, '30d': 30 };
    const days = rangeMap[range] || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await SensorReading.aggregate([
      { $match: { waterSource: require('mongoose').Types.ObjectId.createFromHexString(id), timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          avgPh: { $avg: '$ph' },
          minPh: { $min: '$ph' },
          maxPh: { $max: '$ph' },
          avgTurbidity: { $avg: '$turbidity' },
          minTurbidity: { $min: '$turbidity' },
          maxTurbidity: { $max: '$turbidity' },
          avgTemperature: { $avg: '$temperature' },
          minTemperature: { $min: '$temperature' },
          maxTemperature: { $max: '$temperature' },
          totalReadings: { $sum: 1 },
          unsafeCount: { $sum: { $cond: [{ $eq: ['$safetyStatus', 'unsafe'] }, 1, 0] } },
          warningCount: { $sum: { $cond: [{ $eq: ['$safetyStatus', 'warning'] }, 1, 0] } },
        },
      },
    ]);

    res.json({ success: true, data: stats[0] || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSources, getSource, createSource, updateSource, deleteSource, getSourceStats };
