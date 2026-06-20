const SensorReading = require('../models/SensorReading');
const WaterSource = require('../models/WaterSource');
const Alert = require('../models/Alert');
const Village = require('../models/Village');
const mongoose = require('mongoose');

// GET /api/analytics/overview
const getOverview = async (req, res) => {
  try {
    const [totalSources, safeSources, warningSources, unsafeSources, totalAlerts, unresolvedAlerts, totalVillages] =
      await Promise.all([
        WaterSource.countDocuments({ status: 'active' }),
        WaterSource.countDocuments({ safetyStatus: 'safe' }),
        WaterSource.countDocuments({ safetyStatus: 'warning' }),
        WaterSource.countDocuments({ safetyStatus: 'unsafe' }),
        Alert.countDocuments(),
        Alert.countDocuments({ acknowledged: false }),
        Village.countDocuments(),
      ]);

    // Last 24h readings count
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const readingsToday = await SensorReading.countDocuments({ timestamp: { $gte: since24h } });

    res.json({
      success: true,
      data: {
        totalSources, safeSources, warningSources, unsafeSources,
        totalAlerts, unresolvedAlerts, totalVillages, readingsToday,
        safePercentage: totalSources > 0 ? Math.round((safeSources / totalSources) * 100) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/analytics/trends?sourceId=&range=7d
const getTrends = async (req, res) => {
  try {
    const { sourceId, range = '7d' } = req.query;
    const rangeMap = { '24h': 1, '7d': 7, '30d': 30 };
    const days = rangeMap[range] || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const matchFilter = { timestamp: { $gte: startDate } };
    if (sourceId) matchFilter.waterSource = mongoose.Types.ObjectId.createFromHexString(sourceId);

    // Group by hour for 24h, by day otherwise
    const groupFormat = days === 1
      ? { year: { $year: '$timestamp' }, month: { $month: '$timestamp' }, day: { $dayOfMonth: '$timestamp' }, hour: { $hour: '$timestamp' } }
      : { year: { $year: '$timestamp' }, month: { $month: '$timestamp' }, day: { $dayOfMonth: '$timestamp' } };

    const trends = await SensorReading.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: groupFormat,
          avgPh: { $avg: '$ph' },
          avgTurbidity: { $avg: '$turbidity' },
          avgTemperature: { $avg: '$temperature' },
          count: { $sum: 1 },
          unsafeCount: { $sum: { $cond: [{ $eq: ['$safetyStatus', 'unsafe'] }, 1, 0] } },
          timestamp: { $first: '$timestamp' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } },
    ]);

    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/analytics/village-health
const getVillageHealth = async (req, res) => {
  try {
    const villages = await Village.find();
    const healthData = await Promise.all(
      villages.map(async (village) => {
        const [safe, warning, unsafe, unknown] = await Promise.all([
          WaterSource.countDocuments({ village: village._id, safetyStatus: 'safe' }),
          WaterSource.countDocuments({ village: village._id, safetyStatus: 'warning' }),
          WaterSource.countDocuments({ village: village._id, safetyStatus: 'unsafe' }),
          WaterSource.countDocuments({ village: village._id, safetyStatus: 'unknown' }),
        ]);
        const total = safe + warning + unsafe + unknown;
        return {
          village: { _id: village._id, name: village.name, district: village.district, coordinates: village.coordinates },
          sources: { total, safe, warning, unsafe, unknown },
          healthScore: total > 0 ? Math.round(((safe * 100 + warning * 50) / total)) : 0,
        };
      })
    );
    res.json({ success: true, data: healthData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getOverview, getTrends, getVillageHealth };
