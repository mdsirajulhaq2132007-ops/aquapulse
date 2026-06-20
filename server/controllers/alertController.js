const Alert = require('../models/Alert');

const getAlerts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.village) filter.village = req.query.village;
    if (req.query.source) filter.waterSource = req.query.source;
    if (req.query.acknowledged !== undefined) filter.acknowledged = req.query.acknowledged === 'true';
    if (req.query.type) filter.type = req.query.type;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      Alert.find(filter)
        .populate('waterSource', 'name type')
        .populate('village', 'name district')
        .populate('acknowledgedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Alert.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: alerts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const acknowledgeAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true, acknowledgedBy: req.user._id, acknowledgedAt: new Date() },
      { new: true }
    ).populate('waterSource', 'name type').populate('village', 'name district');

    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

    // Emit socket event
    try {
      const io = require('../config/socket').getIO();
      io.to(`village:${alert.village._id}`).emit('alert:acknowledged', { alertId: alert._id });
    } catch (_) {}

    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAlertStats = async (req, res) => {
  try {
    const [total, unacknowledged, critical] = await Promise.all([
      Alert.countDocuments(),
      Alert.countDocuments({ acknowledged: false }),
      Alert.countDocuments({ type: 'critical', acknowledged: false }),
    ]);

    res.json({ success: true, data: { total, unacknowledged, critical } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAlerts, acknowledgeAlert, getAlertStats };
