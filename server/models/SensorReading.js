const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema({
  // Task-specific fields
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'WaterSource', required: true },
  villageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true },
  status: { type: String, enum: ['SAFE', 'UNSAFE'], required: true },

  // Compatibility fields
  waterSource: { type: mongoose.Schema.Types.ObjectId, ref: 'WaterSource', required: true },
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true },
  safetyStatus: { type: String, enum: ['safe', 'warning', 'unsafe'], required: true },

  deviceId: { type: String, required: true },
  ph: { type: Number, required: true },
  turbidity: { type: Number, required: true },
  temperature: { type: Number, required: true },
  flags: [{ type: String }], // e.g. ['high_ph', 'high_turbidity']
  rawPayload: { type: mongoose.Schema.Types.Mixed }, // original ESP32 payload
  timestamp: { type: Date, default: Date.now },
}, { 
  timestamps: false,
  collection: 'sensor_readings'
});

// Compound index for efficient time-series queries
sensorReadingSchema.index({ waterSource: 1, timestamp: -1 });
sensorReadingSchema.index({ sourceId: 1, timestamp: -1 });
sensorReadingSchema.index({ village: 1, timestamp: -1 });
sensorReadingSchema.index({ villageId: 1, timestamp: -1 });
sensorReadingSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);

