const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'url', 'wifi', 'email', 'phone'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  qrCodeUrl: {
    type: String,
    default: ''
  },
  isScanned: {
    type: Boolean,
    default: false
  },
  scannedFrom: {
    type: String,
    enum: ['image', 'camera', 'manual'],
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    trim: true,
    default: 'general'
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  metadata: {
    scanCount: {
      type: Number,
      default: 0
    },
    lastScanned: {
      type: Date,
      default: null
    },
    deviceInfo: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
qrCodeSchema.index({ userId: 1, createdAt: -1 });
qrCodeSchema.index({ userId: 1, type: 1 });
qrCodeSchema.index({ userId: 1, isFavorite: 1 });
qrCodeSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('QRCode', qrCodeSchema);