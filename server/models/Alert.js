const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  waterSource: { type: mongoose.Schema.Types.ObjectId, ref: 'WaterSource', required: true },
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true },
  type: { type: String, enum: ['critical', 'warning', 'resolved'], required: true },
  parameter: { type: String, required: true }, // 'ph' | 'turbidity' | 'temperature'
  value: { type: Number, required: true },
  threshold: { type: Number, required: true },
  message: { type: String, required: true },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acknowledgedAt: { type: Date },
  resolvedAt: { type: Date },
}, { timestamps: true });

alertSchema.index({ village: 1, createdAt: -1 });
alertSchema.index({ waterSource: 1, acknowledged: 1 });

module.exports = mongoose.model('Alert', alertSchema);
