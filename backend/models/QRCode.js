const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// ==================== ENUMS & CONSTANTS ====================
const QR_TYPES = {
  TEXT: 'text',
  URL: 'url',
  WIFI: 'wifi',
  EMAIL: 'email',
  PHONE: 'phone',
  SMS: 'sms',
  VCARD: 'vcard',
  EVENT: 'event',
  LOCATION: 'location',
  PAYMENT: 'payment',
  CRYPTO: 'crypto',
  APP_STORE: 'app_store',
  SOCIAL: 'social',
  DOCUMENT: 'document'
};

const SCAN_SOURCES = {
  IMAGE: 'image',
  CAMERA: 'camera',
  MANUAL: 'manual',
  API: 'api',
  BULK_IMPORT: 'bulk_import',
  SHARE: 'share',
  WIDGET: 'widget',
  MOBILE_APP: 'mobile_app'
};

const QR_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
  PENDING: 'pending',
  ARCHIVED: 'archived',
  DELETED: 'deleted'
};

const PRIVACY_LEVELS = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  SHARED: 'shared',
  PROTECTED: 'protected'
};

const ERROR_CORRECTION_LEVELS = {
  LOW: 'L',      // ~7% recovery
  MEDIUM: 'M',   // ~15% recovery
  QUARTILE: 'Q', // ~25% recovery
  HIGH: 'H'      // ~30% recovery
};

// ==================== SUB-SCHEMAS ====================

// Analytics Schema
const analyticsSchema = new mongoose.Schema({
  scanCount: { type: Number, default: 0, min: 0 },
  uniqueScans: { type: Number, default: 0, min: 0 },
  lastScanned: { type: Date, default: null },
  firstScanned: { type: Date, default: null },
  
  // Geographic Analytics
  scansByCountry: {
    type: Map,
    of: Number,
    default: new Map()
  },
  scansByCity: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  // Device Analytics
  deviceTypes: {
    mobile: { type: Number, default: 0 },
    desktop: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 },
    unknown: { type: Number, default: 0 }
  },
  
  // Browser Analytics
  browsers: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  // Operating System Analytics
  operatingSystems: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  // Time-based Analytics
  hourlyScans: {
    type: Map,
    of: Number,
    default: new Map()
  },
  dailyScans: {
    type: Map,
    of: Number,
    default: new Map()
  },
  monthlyScans: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  // Performance Analytics
  averageLoadTime: { type: Number, default: 0 },
  bounceRate: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  
  // Referrer Analytics
  referrers: {
    type: Map,
    of: Number,
    default: new Map()
  }
}, { _id: false });

// Security Schema
const securitySchema = new mongoose.Schema({
  isPasswordProtected: { type: Boolean, default: false },
  password: {
    type: String,
    select: false, // Don't include in queries by default
    validate: {
      validator: function(v) {
        return !this.isPasswordProtected || (v && v.length >= 8);
      },
      message: 'Password must be at least 8 characters long'
    }
  },
  
  // Access Control
  allowedIPs: [{
    ip: { type: String, required: true },
    description: String,
    addedAt: { type: Date, default: Date.now }
  }],
  blockedIPs: [{
    ip: { type: String, required: true },
    reason: String,
    blockedAt: { type: Date, default: Date.now }
  }],
  
  // Time-based Access
  accessSchedule: {
    enabled: { type: Boolean, default: false },
    timezone: { type: String, default: 'UTC' },
    allowedHours: {
      start: { type: Number, min: 0, max: 23 },
      end: { type: Number, min: 0, max: 23 }
    },
    allowedDays: [{ type: Number, min: 0, max: 6 }] // 0 = Sunday, 6 = Saturday
  },
  
  // Rate Limiting
  rateLimit: {
    enabled: { type: Boolean, default: false },
    maxScansPerHour: { type: Number, default: 100, min: 1 },
    maxScansPerDay: { type: Number, default: 1000, min: 1 }
  },
  
  // Domain Restrictions
  allowedDomains: [{ type: String, trim: true }],
  blockedDomains: [{ type: String, trim: true }],
  
  // Encryption
  isEncrypted: { type: Boolean, default: false },
  encryptionKey: { type: String, select: false },
  encryptionAlgorithm: { 
    type: String, 
    enum: ['aes-256-gcm', 'aes-192-gcm', 'aes-128-gcm'],
    default: 'aes-256-gcm'
  },
  
  // Digital Signature
  isSignedDigitally: { type: Boolean, default: false },
  digitalSignature: { type: String, select: false },
  signatureAlgorithm: {
    type: String,
    enum: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'],
    default: 'RS256'
  }
}, { _id: false });

// QR Generation Options Schema
const qrOptionsSchema = new mongoose.Schema({
  size: {
    width: { type: Number, default: 300, min: 100, max: 2000 },
    height: { type: Number, default: 300, min: 100, max: 2000 }
  },
  
  errorCorrectionLevel: {
    type: String,
    enum: Object.values(ERROR_CORRECTION_LEVELS),
    default: ERROR_CORRECTION_LEVELS.MEDIUM
  },
  
  margin: { type: Number, default: 4, min: 0, max: 20 },
  
  colors: {
    foreground: { type: String, default: '#000000', match: /^#[0-9A-F]{6}$/i },
    background: { type: String, default: '#FFFFFF', match: /^#[0-9A-F]{6}$/i },
    gradient: {
      enabled: { type: Boolean, default: false },
      type: { type: String, enum: ['linear', 'radial'], default: 'linear' },
      colors: [{ type: String, match: /^#[0-9A-F]{6}$/i }],
      direction: { type: Number, default: 0, min: 0, max: 360 }
    }
  },
  
  logo: {
    enabled: { type: Boolean, default: false },
    url: String,
    size: { type: Number, default: 20, min: 5, max: 50 }, // Percentage of QR code size
    border: { type: Boolean, default: true },
    borderRadius: { type: Number, default: 0, min: 0, max: 50 }
  },
  
  style: {
    type: String,
    enum: ['square', 'rounded', 'dots', 'classy', 'classy-rounded'],
    default: 'square'
  },
  
  format: {
    type: String,
    enum: ['png', 'jpg', 'svg', 'pdf'],
    default: 'png'
  },
  
  quality: { type: Number, default: 0.92, min: 0.1, max: 1.0 }
}, { _id: false });

// Sharing Schema
const sharingSchema = new mongoose.Schema({
  isPublic: { type: Boolean, default: false },
  shareToken: { 
    type: String, 
    unique: true, 
    sparse: true,
    default: () => crypto.randomBytes(32).toString('hex')
  },
  
  sharedWith: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    permissions: {
      canView: { type: Boolean, default: true },
      canEdit: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      canShare: { type: Boolean, default: false }
    },
    sharedAt: { type: Date, default: Date.now },
    expiresAt: Date
  }],
  
  publicUrl: String,
  embedCode: String,
  
  socialSharing: {
    facebook: { type: Boolean, default: true },
    twitter: { type: Boolean, default: true },
    linkedin: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true },
    telegram: { type: Boolean, default: true }
  }
}, { _id: false });

// Version Control Schema
const versionSchema = new mongoose.Schema({
  version: { type: Number, required: true },
  content: { type: String, required: true },
  qrCodeUrl: String,
  changes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

// Backup Schema
const backupSchema = new mongoose.Schema({
  cloudProvider: {
    type: String,
    enum: ['aws', 'gcp', 'azure', 'dropbox', 'gdrive'],
    required: true
  },
  bucketName: String,
  fileKey: String,
  url: String,
  size: Number,
  checksum: String,
  backedUpAt: { type: Date, default: Date.now },
  expiresAt: Date
}, { _id: false });

// ==================== MAIN SCHEMA ====================
const advancedQRCodeSchema = new mongoose.Schema({
  // Basic Information
  qrId: { 
    type: String, 
    unique: true, 
    default: () => `qr_${uuidv4().replace(/-/g, '').substring(0, 16)}` 
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Enhanced Type System
  type: {
    type: String,
    enum: Object.values(QR_TYPES),
    required: true,
    index: true
  },
  
  subType: { // For more specific categorization
    type: String,
    trim: true
  },
  
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: [200, 'Title cannot exceed 200 characters'],
    index: 'text'
  },
  
  description: {
    type: String,
    trim: true,
    maxLength: [1000, 'Description cannot exceed 1000 characters'],
    index: 'text'
  },
  
  // Content Management
  content: {
    type: String,
    required: true,
    index: 'text'
  },
  
  originalContent: { // Store original before any processing
    type: String
  },
  
  processedContent: { // Store processed/optimized content
    type: String
  },
  
  // QR Code URLs and Files
  qrCodeUrl: {
    type: String,
    default: ''
  },
  
  qrCodeUrls: { // Multiple formats
    png: String,
    jpg: String,
    svg: String,
    pdf: String
  },
  
  // Status and Lifecycle
  status: {
    type: String,
    enum: Object.values(QR_STATUS),
    default: QR_STATUS.ACTIVE,
    index: true
  },
  
  privacyLevel: {
    type: String,
    enum: Object.values(PRIVACY_LEVELS),
    default: PRIVACY_LEVELS.PRIVATE,
    index: true
  },
  
  // Organization
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxLength: 50
  }],
  
  category: {
    type: String,
    trim: true,
    default: 'general',
    maxLength: 100,
    index: true
  },
  
  subcategory: {
    type: String,
    trim: true,
    maxLength: 100
  },
  
  // User Preferences
  isFavorite: {
    type: Boolean,
    default: false,
    index: true
  },
  
  isPinned: {
    type: Boolean,
    default: false
  },
  
  color: { // Color coding for organization
    type: String,
    match: /^#[0-9A-F]{6}$/i,
    default: '#000000'
  },
  
  icon: { // Icon for visual identification
    type: String,
    maxLength: 50
  },
  
  // Scanning Information
  isScanned: {
    type: Boolean,
    default: false,
    index: true
  },
  
  scannedFrom: {
    type: String,
    enum: Object.values(SCAN_SOURCES),
    default: null
  },
  
  // Advanced Features
  analytics: analyticsSchema,
  security: securitySchema,
  qrOptions: qrOptionsSchema,
  sharing: sharingSchema,
  
  // Version Control
  versions: [versionSchema],
  currentVersion: { type: Number, default: 1 },
  
  // Backup Information
  backups: [backupSchema],
  lastBackup: Date,
  
  // Expiration and Scheduling
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  },
  
  scheduledFor: Date, // For scheduled publishing
  
  // Geolocation
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  // Advanced Metadata
  metadata: {
    // File Information
    fileSize: { type: Number, default: 0 },
    fileSizeFormatted: String,
    mimeType: String,
    encoding: String,
    
    // Generation Information
    generationTime: { type: Number, default: 0 }, // milliseconds
    generatedBy: {
      service: String,
      version: String,
      library: String
    },
    
    // Device Information
    deviceInfo: {
      userAgent: String,
      platform: String,
      browser: String,
      os: String,
      device: String,
      isMobile: Boolean,
      screenResolution: String
    },
    
    // Network Information
    ipAddress: String,
    country: String,
    region: String,
    city: String,
    timezone: String,
    isp: String,
    
    // Performance Metrics
    renderTime: Number,
    loadTime: Number,
    cacheHit: Boolean,
    cdnUsed: Boolean,
    
    // SEO Metadata
    seoTitle: String,
    seoDescription: String,
    seoKeywords: [String],
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    
    // Custom Fields
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },
  
  // API and Integration
  apiVersion: { type: String, default: 'v1' },
  source: { // Where the QR code was created
    type: String,
    enum: ['web', 'mobile', 'api', 'bulk', 'import', 'widget'],
    default: 'web'
  },
  
  integrations: [{
    service: { type: String, required: true },
    externalId: String,
    data: mongoose.Schema.Types.Mixed,
    syncedAt: { type: Date, default: Date.now }
  }],
  
  // Compliance and Legal
  gdprCompliant: { type: Boolean, default: false },
  ccpaCompliant: { type: Boolean, default: false },
  retentionPeriod: { type: Number }, // in days
  
  // Audit Trail
  auditLog: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'deleted', 'scanned', 'shared', 'exported', 'archived'],
      required: true
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedAt: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,
    changes: mongoose.Schema.Types.Mixed,
    reason: String
  }]

}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// ==================== INDEXES ====================
// Compound indexes for better query performance
advancedQRCodeSchema.index({ userId: 1, createdAt: -1 });
advancedQRCodeSchema.index({ userId: 1, type: 1, status: 1 });
advancedQRCodeSchema.index({ userId: 1, isFavorite: 1 });
advancedQRCodeSchema.index({ userId: 1, category: 1 });
advancedQRCodeSchema.index({ userId: 1, tags: 1 });
advancedQRCodeSchema.index({ status: 1, expiresAt: 1 });
advancedQRCodeSchema.index({ 'sharing.isPublic': 1, status: 1 });
advancedQRCodeSchema.index({ qrId: 1 });

// Text search indexes
advancedQRCodeSchema.index({ 
  title: 'text', 
  description: 'text', 
  content: 'text', 
  tags: 'text',
  'metadata.seoTitle': 'text',
  'metadata.seoDescription': 'text'
});

// Geospatial index
advancedQRCodeSchema.index({ location: '2dsphere' });

// Analytics indexes
advancedQRCodeSchema.index({ 'analytics.scanCount': -1 });
advancedQRCodeSchema.index({ 'analytics.lastScanned': -1 });

// ==================== VIRTUALS ====================
advancedQRCodeSchema.virtual('scanRate').get(function() {
  const daysSinceCreation = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCreation > 0 ? (this.analytics.scanCount / daysSinceCreation).toFixed(2) : 0;
});

advancedQRCodeSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

advancedQRCodeSchema.virtual('timeUntilExpiry').get(function() {
  if (!this.expiresAt) return null;
  const timeDiff = this.expiresAt.getTime() - Date.now();
  return timeDiff > 0 ? timeDiff : 0;
});

advancedQRCodeSchema.virtual('formattedFileSize').get(function() {
  const bytes = this.metadata.fileSize || 0;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware
advancedQRCodeSchema.pre('save', async function(next) {
  try {
    // Hash password if provided
    if (this.security?.password && this.isModified('security.password')) {
      this.security.password = await bcrypt.hash(this.security.password, 12);
    }
    
    // Generate share token if public
    if (this.sharing?.isPublic && !this.sharing.shareToken) {
      this.sharing.shareToken = crypto.randomBytes(32).toString('hex');
    }
    
    // Set processed content if not provided
    if (!this.processedContent) {
      this.processedContent = this.content;
    }
    
    // Calculate file size
    if (this.qrCodeUrl) {
      this.metadata.fileSize = Buffer.byteLength(this.qrCodeUrl, 'utf8');
      this.metadata.fileSizeFormatted = this.formattedFileSize;
    }
    
    // Version control
    if (this.isModified('content') && !this.isNew) {
      this.versions.push({
        version: this.currentVersion,
        content: this.content,
        qrCodeUrl: this.qrCodeUrl,
        changes: 'Content updated',
        createdBy: this.userId
      });
      this.currentVersion += 1;
    }
    
    // Audit log for new documents
    if (this.isNew) {
      this.auditLog.push({
        action: 'created',
        performedBy: this.userId,
        changes: { created: true }
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-update middleware
advancedQRCodeSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// ==================== METHODS ====================

// Instance Methods
advancedQRCodeSchema.methods.incrementScanCount = async function(scanData = {}) {
  this.analytics.scanCount += 1;
  this.analytics.lastScanned = new Date();
  
  if (!this.analytics.firstScanned) {
    this.analytics.firstScanned = new Date();
  }
  
  // Update device analytics
  if (scanData.deviceType) {
    this.analytics.deviceTypes[scanData.deviceType] = 
      (this.analytics.deviceTypes[scanData.deviceType] || 0) + 1;
  }
  
  // Update geographic analytics
  if (scanData.country) {
    this.analytics.scansByCountry.set(
      scanData.country, 
      (this.analytics.scansByCountry.get(scanData.country) || 0) + 1
    );
  }
  
  // Add audit log
  this.auditLog.push({
    action: 'scanned',
    performedAt: new Date(),
    ipAddress: scanData.ipAddress,
    userAgent: scanData.userAgent
  });
  
  this.isScanned = true;
  return this.save();
};

advancedQRCodeSchema.methods.validatePassword = async function(password) {
  if (!this.security?.isPasswordProtected || !this.security.password) {
    return true;
  }
  return bcrypt.compare(password, this.security.password);
};

advancedQRCodeSchema.methods.generateShareUrl = function(baseUrl = '') {
  if (!this.sharing?.shareToken) {
    this.sharing.shareToken = crypto.randomBytes(32).toString('hex');
  }
  return `${baseUrl}/shared/${this.sharing.shareToken}`;
};

advancedQRCodeSchema.methods.archive = function(reason = '') {
  this.status = QR_STATUS.ARCHIVED;
  this.auditLog.push({
    action: 'archived',
    performedBy: this.userId,
    reason,
    performedAt: new Date()
  });
  return this.save();
};

advancedQRCodeSchema.methods.restore = function(reason = '') {
  this.status = QR_STATUS.ACTIVE;
  this.auditLog.push({
    action: 'restored',
    performedBy: this.userId,
    reason,
    performedAt: new Date()
  });
  return this.save();
};

// Static Methods
advancedQRCodeSchema.statics.findByShareToken = function(shareToken) {
  return this.findOne({ 
    'sharing.shareToken': shareToken, 
    'sharing.isPublic': true,
    status: QR_STATUS.ACTIVE
  });
};

advancedQRCodeSchema.statics.getAnalyticsSummary = async function(userId, dateRange = {}) {
  const matchStage = { userId: new mongoose.Types.ObjectId(userId) };
  
  if (dateRange.start || dateRange.end) {
    matchStage.createdAt = {};
    if (dateRange.start) matchStage.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) matchStage.createdAt.$lte = new Date(dateRange.end);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalQRCodes: { $sum: 1 },
        totalScans: { $sum: '$analytics.scanCount' },
        avgScansPerQR: { $avg: '$analytics.scanCount' },
        favoriteCount: { $sum: { $cond: ['$isFavorite', 1, 0] } },
        typeDistribution: {
          $push: {
            type: '$type',
            count: 1
          }
        }
      }
    }
  ]);
};

advancedQRCodeSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lte: new Date() },
    status: { $ne: QR_STATUS.ARCHIVED }
  });
};

// ==================== PLUGINS ====================
// Add pagination plugin if available
// advancedQRCodeSchema.plugin(require('mongoose-paginate-v2'));

// ==================== EXPORT ====================
module.exports = mongoose.model('QRCode', advancedQRCodeSchema);
