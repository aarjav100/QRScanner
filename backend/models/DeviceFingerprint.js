const mongoose = require('mongoose');

const deviceFingerprintSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fingerprint: { type: String, required: true, index: true },
  userAgent: { type: String },
  ip: { type: String },
  createdAt: { type: Date, default: Date.now }
});

deviceFingerprintSchema.index({ userId: 1, fingerprint: 1 }, { unique: true });

module.exports = mongoose.model('DeviceFingerprint', deviceFingerprintSchema); 