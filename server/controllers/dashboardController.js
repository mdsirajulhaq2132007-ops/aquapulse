const WaterSource = require('../models/WaterSource');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const Village = require('../models/Village');

/**
 * GET /api/dashboard/stats
 * Aggregated counts for the dashboard stat cards.
 */
const getDashboardStats = async (req, res) => {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalVillages,
      totalSources,
      safeSources,
      warningSources,
      unsafeSources,
      totalAlerts,
      unresolvedAlerts,
      readingsToday,
    ] = await Promise.all([
      Village.countDocuments(),
      WaterSource.countDocuments({ status: 'active' }),
      WaterSource.countDocuments({ safetyStatus: 'safe' }),
      WaterSource.countDocuments({ safetyStatus: 'warning' }),
      WaterSource.countDocuments({ safetyStatus: 'unsafe' }),
      Alert.countDocuments(),
      Alert.countDocuments({ acknowledged: false }),
      SensorReading.countDocuments({ timestamp: { $gte: since24h } }),
    ]);

    res.json({
      success: true,
      data: {
        totalVillages,
        totalSources,
        safeSources,
        warningSources,
        unsafeSources,
        totalAlerts,
        unresolvedAlerts,
        readingsToday,
        safePercentage: totalSources > 0
          ? Math.round((safeSources / totalSources) * 100)
          : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
