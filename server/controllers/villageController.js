const Village = require('../models/Village');
const WaterSource = require('../models/WaterSource');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');

const getVillages = async (req, res) => {
  try {
    const villages = await Village.find().populate('createdBy', 'name');
    res.json({ success: true, data: villages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getVillage = async (req, res) => {
  try {
    const village = await Village.findById(req.params.id).populate('createdBy', 'name');
    if (!village) return res.status(404).json({ success: false, message: 'Village not found' });
    res.json({ success: true, data: village });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createVillage = async (req, res) => {
  try {
    const village = await Village.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: village });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateVillage = async (req, res) => {
  try {
    const village = await Village.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!village) return res.status(404).json({ success: false, message: 'Village not found' });
    res.json({ success: true, data: village });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteVillage = async (req, res) => {
  try {
    const villageId = req.params.id;
    const village = await Village.findByIdAndDelete(villageId);
    if (!village) return res.status(404).json({ success: false, message: 'Village not found' });

    // Cascade delete related water sources, sensor readings, and alerts
    await Promise.all([
      WaterSource.deleteMany({ village: villageId }),
      SensorReading.deleteMany({ village: villageId }),
      Alert.deleteMany({ village: villageId })
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

    res.json({ success: true, message: 'Village and all associated water sources, readings, and alerts deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getVillages, getVillage, createVillage, updateVillage, deleteVillage };
