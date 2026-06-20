const mongoose = require('mongoose');

const waterSourceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true },
  type: {
    type: String,
    enum: ['borewell', 'well', 'water_tank', 'tap_water', 'river', 'lake', 'hand_pump'],
    required: true,
  },
  installationDate: { type: Date },
  deviceId: { type: String, unique: true, sparse: true },
  location: {
    lat: { type: Number },
    lng: { type: Number },
  },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
  safetyStatus: { type: String, enum: ['safe', 'warning', 'unsafe', 'unknown'], default: 'unknown' },
  lastReading: { type: Date },
  lastReadingValues: {
    ph: Number,
    turbidity: Number,
    temperature: Number,
  },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('WaterSource', waterSourceSchema);
