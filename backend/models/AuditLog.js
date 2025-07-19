const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  ip: String,
  userAgent: String,
  deviceFingerprint: String,
  success: Boolean,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  error: String,
  errorCode: String,
  geoLocation: {
    country: String,
    region: String,
    city: String
  },
  headers: {
    origin: String,
    referer: String,
    'accept-language': String
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema); 