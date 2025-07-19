const mongoose = require('mongoose');

const blacklistedTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  blacklistedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BlacklistedToken', blacklistedTokenSchema); 