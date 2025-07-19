const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');
const { v4: uuidv4 } = require('uuid');
const speakeasy = require('speakeasy');

// ==================== ENUMS & CONSTANTS ====================
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
  HIGH_CONTRAST: 'high_contrast',
  SEPIA: 'sepia'
};

const EXPORT_FORMATS = {
  PNG: 'png',
  JPG: 'jpg',
  SVG: 'svg',
  PDF: 'pdf',
  WEBP: 'webp'
};

const USER_ROLES = {
  ADMIN: 'admin',
  PREMIUM: 'premium',
  STANDARD: 'standard',
  BASIC: 'basic',
  TRIAL: 'trial'
};

const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING_VERIFICATION: 'pending_verification',
  LOCKED: 'locked',
  DELETED: 'deleted'
};

const NOTIFICATION_TYPES = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in_app',
  WEBHOOK: 'webhook'
};

const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise'
};

const LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 
  'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney'
];

// ==================== SUB-SCHEMAS ====================

// Advanced User Preferences Schema
const advancedUserPreferencesSchema = new mongoose.Schema({
  // UI/UX Preferences
  theme: {
    type: String,
    enum: Object.values(THEMES),
    default: THEMES.LIGHT
  },
  
  colorScheme: {
    primary: { type: String, default: '#3B82F6', match: /^#[0-9A-F]{6}$/i },
    secondary: { type: String, default: '#6B7280', match: /^#[0-9A-F]{6}$/i },
    accent: { type: String, default: '#10B981', match: /^#[0-9A-F]{6}$/i }
  },
  
  fontSize: {
    type: String,
    enum: ['small', 'medium', 'large', 'extra-large'],
    default: 'medium'
  },
  
  animations: {
    enabled: { type: Boolean, default: true },
    reducedMotion: { type: Boolean, default: false }
  },
  
  // Language & Localization
  language: {
    type: String,
    enum: LANGUAGES,
    default: 'en'
  },
  
  timezone: {
    type: String,
    enum: TIMEZONES,
    default: 'UTC'
  },
  
  dateFormat: {
    type: String,
    enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'],
    default: 'MM/DD/YYYY'
  },
  
  timeFormat: {
    type: String,
    enum: ['12h', '24h'],
    default: '12h'
  },
  
  currency: {
    type: String,
    default: 'USD',
    maxlength: 3
  },
  
  // QR Code Preferences
  defaultQRSize: {
    type: Number,
    default: 300,
    min: [100, 'QR size must be at least 100px'],
    max: [2000, 'QR size cannot exceed 2000px']
  },
  
  defaultQRColors: {
    foreground: { type: String, default: '#000000', match: /^#[0-9A-F]{6}$/i },
    background: { type: String, default: '#FFFFFF', match: /^#[0-9A-F]{6}$/i }
  },
  
  defaultErrorCorrection: {
    type: String,
    enum: ['L', 'M', 'Q', 'H'],
    default: 'M'
  },
  
  // Export Preferences
  exportFormat: {
    type: String,
    enum: Object.values(EXPORT_FORMATS),
    default: EXPORT_FORMATS.PNG
  },
  
  exportQuality: {
    type: Number,
    default: 0.92,
    min: [0.1, 'Quality must be at least 0.1'],
    max: [1.0, 'Quality cannot exceed 1.0']
  },
  
  // Workflow Preferences
  autoSave: {
    type: Boolean,
    default: true
  },
  
  autoSaveInterval: { // in seconds
    type: Number,
    default: 30,
    min: 10,
    max: 300
  },
  
  showTutorial: {
    type: Boolean,
    default: true
  },
  
  showTooltips: {
    type: Boolean,
    default: true
  },
  
  compactMode: {
    type: Boolean,
    default: false
  },
  
  // Privacy Preferences
  profileVisibility: {
    type: String,
    enum: ['public', 'private', 'contacts'],
    default: 'private'
  },
  
  allowAnalytics: {
    type: Boolean,
    default: true
  },
  
  allowMarketing: {
    type: Boolean,
    default: false
  },
  
  // Dashboard Preferences
  dashboardLayout: {
    type: String,
    enum: ['grid', 'list', 'cards'],
    default: 'grid'
  },
  
  itemsPerPage: {
    type: Number,
    default: 20,
    min: 10,
    max: 100
  },
  
  defaultSort: {
    field: {
      type: String,
      enum: ['createdAt', 'updatedAt', 'title', 'scanCount'],
      default: 'createdAt'
    },
    order: {
      type: String,
      enum: ['asc', 'desc'],
      default: 'desc'
    }
  },
  
  // Notification Preferences
  notifications: {
    enabled: { type: Boolean, default: true },
    
    channels: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true }
    },
    
    types: {
      qrScanned: { type: Boolean, default: true },
      systemUpdates: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      weeklyReport: { type: Boolean, default: true },
      accountActivity: { type: Boolean, default: true }
    },
    
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: '22:00' },
      end: { type: String, default: '08:00' },
      timezone: { type: String, default: 'UTC' }
    },
    
    frequency: {
      type: String,
      enum: ['instant', 'daily', 'weekly', 'never'],
      default: 'instant'
    }
  },
  
  // Backup & Sync Preferences
  autoBackup: {
    enabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    cloudProvider: {
      type: String,
      enum: ['none', 'google_drive', 'dropbox', 'onedrive', 'icloud'],
      default: 'none'
    }
  }
}, { _id: false });

// Security Settings Schema
const securitySettingsSchema = new mongoose.Schema({
  // Two-Factor Authentication
  twoFactorAuth: {
    enabled: { type: Boolean, default: false },
    secret: { type: String, select: false },
    backupCodes: [{ type: String, select: false }],
    lastUsed: Date,
    method: {
      type: String,
      enum: ['totp', 'sms', 'email'],
      default: 'totp'
    }
  },
  
  // Password Settings
  passwordSettings: {
    lastChanged: { type: Date, default: Date.now },
    changeRequired: { type: Boolean, default: false },
    changeReason: String,
    history: [{
      hash: { type: String, select: false },
      changedAt: { type: Date, default: Date.now }
    }],
    strength: {
      score: { type: Number, min: 0, max: 4, default: 0 },
      feedback: [String]
    }
  },
  
  // Session Management
  sessions: [{
    sessionId: { type: String, unique: true },
    deviceInfo: {
      userAgent: String,
      browser: String,
      os: String,
      device: String,
      ip: String
    },
    location: {
      country: String,
      region: String,
      city: String,
      coordinates: [Number]
    },
    createdAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }],
  
  // Login Security
  loginAttempts: {
    failed: { type: Number, default: 0 },
    lastFailedAt: Date,
    lockoutUntil: Date,
    successfulLogins: { type: Number, default: 0 },
    lastSuccessfulAt: Date
  },
  
  // Device Trust
  trustedDevices: [{
    deviceId: String,
    name: String,
    fingerprint: String,
    addedAt: { type: Date, default: Date.now },
    lastUsed: Date,
    isActive: { type: Boolean, default: true }
  }],
  
  // Security Questions
  securityQuestions: [{
    question: String,
    answerHash: { type: String, select: false },
    setAt: { type: Date, default: Date.now }
  }],
  
  // Access Control
  ipWhitelist: [{
    ip: String,
    description: String,
    addedAt: { type: Date, default: Date.now }
  }],
  
  // Privacy Settings
  privacySettings: {
    shareUsageData: { type: Boolean, default: false },
    allowThirdPartyIntegrations: { type: Boolean, default: true },
    dataRetentionPeriod: { type: Number, default: 365 }, // days
    allowProfileDiscovery: { type: Boolean, default: false }
  }
}, { _id: false });

// Subscription Schema
const subscriptionSchema = new mongoose.Schema({
  tier: {
    type: String,
    enum: Object.values(SUBSCRIPTION_TIERS),
    default: SUBSCRIPTION_TIERS.FREE
  },
  
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'unpaid', 'incomplete'],
    default: 'active'
  },
  
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  trialEndDate: Date,
  
  billing: {
    customerId: String, // Stripe/PayPal customer ID
    subscriptionId: String, // External subscription ID
    paymentMethod: String,
    lastPayment: {
      amount: Number,
      currency: String,
      date: Date,
      status: String
    },
    nextPayment: {
      amount: Number,
      currency: String,
      date: Date
    }
  },
  
  limits: {
    qrCodesPerMonth: { type: Number, default: 10 },
    maxQRCodes: { type: Number, default: 50 },
    maxScansPerQR: { type: Number, default: 1000 },
    customBranding: { type: Boolean, default: false },
    analyticsRetention: { type: Number, default: 30 }, // days
    apiCallsPerDay: { type: Number, default: 100 }
  },
  
  usage: {
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    qrCodesCreated: { type: Number, default: 0 },
    totalScans: { type: Number, default: 0 },
    apiCallsUsed: { type: Number, default: 0 }
  },
  
  features: [{
    name: String,
    enabled: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now }
  }]
}, { _id: false });

// Profile Schema
const profileSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  
  displayName: {
    type: String,
    trim: true,
    maxlength: [100, 'Display name cannot exceed 100 characters']
  },
  
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  
  avatar: {
    url: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || validator.isURL(v, { protocols: ['http', 'https'] });
        },
        message: 'Invalid avatar URL'
      }
    },
    provider: {
      type: String,
      enum: ['upload', 'gravatar', 'dicebear', 'initials'],
      default: 'dicebear'
    },
    uploadedAt: Date
  },
  
  contactInfo: {
    phone: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || validator.isMobilePhone(v);
        },
        message: 'Invalid phone number'
      }
    },
    
    website: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || validator.isURL(v, { protocols: ['http', 'https'] });
        },
        message: 'Invalid website URL'
      }
    },
    
    location: {
      country: String,
      state: String,
      city: String,
      zipCode: String,
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    },
    
    socialMedia: {
      linkedin: String,
      twitter: String,
      github: String,
      facebook: String
    }
  },
  
  organization: {
    name: String,
    role: String,
    industry: String,
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-1000', '1000+']
    }
  },
  
  interests: [String],
  skills: [String],
  
  verification: {
    email: {
      verified: { type: Boolean, default: false },
      token: String,
      tokenExpires: Date,
      verifiedAt: Date
    },
    phone: {
      verified: { type: Boolean, default: false },
      code: String,
      codeExpires: Date,
      verifiedAt: Date
    },
    identity: {
      verified: { type: Boolean, default: false },
      method: String,
      verifiedAt: Date,
      documents: [String]
    }
  }
}, { _id: false });

// ==================== MAIN USER SCHEMA ====================
const advancedUserSchema = new mongoose.Schema({
  // Unique Identifier
  userId: {
    type: String,
    unique: true,
    default: () => `user_${uuidv4().replace(/-/g, '').substring(0, 16)}`
  },
  
  // Basic Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: 'Please provide a valid email address'
    },
    index: true
  },
  
  // Legacy name field for backward compatibility
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
    // Virtual getter will combine firstName and lastName if this is not set
    get: function() {
      if (this._name) return this._name;
      const firstName = this.profile?.firstName || '';
      const lastName = this.profile?.lastName || '';
      return `${firstName} ${lastName}`.trim() || this.email;
    },
    set: function(value) {
      this._name = value;
    }
  },
  
  // Enhanced profile information
  profile: profileSchema,
  
  // Authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false, // Don't include in queries by default
    validate: {
      validator: function(password) {
        // Password strength validation
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/;
        return strongRegex.test(password);
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }
  },
  
  // Account Status
  status: {
    type: String,
    enum: Object.values(USER_STATUS),
    default: USER_STATUS.PENDING_VERIFICATION,
    index: true
  },
  
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.BASIC,
    index: true
  },
  
  // Enhanced preferences
  preferences: {
    type: advancedUserPreferencesSchema,
    default: () => ({})
  },
  
  // Security settings
  security: securitySettingsSchema,
  
  // Subscription information
  subscription: subscriptionSchema,
  
  // Account activity
  activity: {
    lastLogin: Date,
    lastActivity: Date,
    loginCount: { type: Number, default: 0 },
    createdQRCodes: { type: Number, default: 0 },
    totalScans: { type: Number, default: 0 },
    lastIP: String,
    registrationIP: String
  },
  
  // API & Integration
  apiKeys: [{
    keyId: { type: String, unique: true },
    name: String,
    key: { type: String, select: false },
    permissions: [String],
    createdAt: { type: Date, default: Date.now },
    lastUsed: Date,
    expiresAt: Date,
    isActive: { type: Boolean, default: true }
  }],
  
  // Connected services
  integrations: [{
    service: {
      type: String,
      enum: ['google', 'microsoft', 'dropbox', 'github', 'slack', 'zapier']
    },
    serviceId: String,
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    connectedAt: { type: Date, default: Date.now },
    lastSync: Date,
    isActive: { type: Boolean, default: true }
  }],
  
  // Compliance & Legal
  gdprConsent: {
    given: { type: Boolean, default: false },
    givenAt: Date,
    ipAddress: String,
    version: String
  },
  
  termsAccepted: {
    version: String,
    acceptedAt: Date,
    ipAddress: String
  },
  
  // Marketing preferences
  marketing: {
    emailOptIn: { type: Boolean, default: false },
    smsOptIn: { type: Boolean, default: false },
    source: String, // utm_source
    campaign: String, // utm_campaign
    referrer: String
  },
  
  // Feature flags
  featureFlags: {
    type: Map,
    of: Boolean,
    default: new Map()
  },
  
  // Audit trail
  auditLog: [{
    action: String,
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Soft delete
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletionReason: String

}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      delete ret._name;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// ==================== INDEXES ====================
// Compound indexes for better performance
advancedUserSchema.index({ email: 1 });
advancedUserSchema.index({ userId: 1 });
advancedUserSchema.index({ status: 1, role: 1 });
advancedUserSchema.index({ 'subscription.tier': 1, status: 1 });
advancedUserSchema.index({ createdAt: -1 });
advancedUserSchema.index({ 'activity.lastLogin': -1 });
advancedUserSchema.index({ deletedAt: 1 });

// Text search index
advancedUserSchema.index({ 
  name: 'text', 
  email: 'text', 
  'profile.displayName': 'text',
  'profile.bio': 'text'
});

// Geospatial index for location-based queries
advancedUserSchema.index({ 'profile.contactInfo.location.coordinates': '2dsphere' });

// ==================== VIRTUALS ====================
advancedUserSchema.virtual('fullName').get(function() {
  const firstName = this.profile?.firstName || '';
  const lastName = this.profile?.lastName || '';
  return `${firstName} ${lastName}`.trim() || this.name || this.email;
});

advancedUserSchema.virtual('isTrialActive').get(function() {
  const trialEnd = this.subscription?.trialEndDate;
  return trialEnd && trialEnd > new Date();
});

advancedUserSchema.virtual('subscriptionDaysRemaining').get(function() {
  const endDate = this.subscription?.endDate;
  if (!endDate) return null;
  const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysLeft);
});

advancedUserSchema.virtual('avatarUrl').get(function() {
  if (this.profile?.avatar?.url) {
    return this.profile.avatar.url;
  }
  
  // Generate default avatar based on provider preference
  const provider = this.profile?.avatar?.provider || 'dicebear';
  const seed = this.email;
  
  switch (provider) {
    case 'gravatar':
      const emailHash = crypto.createHash('md5').update(seed.toLowerCase()).digest('hex');
      return `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=200`;
    case 'dicebear':
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
    case 'initials':
      const initials = this.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200`;
    default:
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  }
});

advancedUserSchema.virtual('isEmailVerified').get(function() {
  return this.profile?.verification?.email?.verified || false;
});

advancedUserSchema.virtual('isPhoneVerified').get(function() {
  return this.profile?.verification?.phone?.verified || false;
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware
advancedUserSchema.pre('save', async function(next) {
  try {
    // Hash password if modified
    if (this.isModified('password')) {
      const saltRounds = process.env.NODE_ENV === 'production' ? 14 : 10;
      this.password = await bcrypt.hash(this.password, saltRounds);
      
      // Update password history
      if (!this.security) this.security = {};
      if (!this.security.passwordSettings) this.security.passwordSettings = {};
      
      this.security.passwordSettings.lastChanged = new Date();
      
      // Add to password history
      if (!this.security.passwordSettings.history) {
        this.security.passwordSettings.history = [];
      }
      
      this.security.passwordSettings.history.push({
        hash: this.password,
        changedAt: new Date()
      });
      
      // Keep only last 5 passwords
      if (this.security.passwordSettings.history.length > 5) {
        this.security.passwordSettings.history.shift();
      }
    }
    
    // Set registration IP on first save
    if (this.isNew && !this.activity?.registrationIP) {
      if (!this.activity) this.activity = {};
      // You would set this from the request context
      // this.activity.registrationIP = req.ip;
    }
    
    // Generate API key if user is premium or above
    if (this.isModified('subscription.tier') && 
        ['premium', 'enterprise'].includes(this.subscription?.tier) && 
        this.apiKeys.length === 0) {
      
      const apiKey = {
        keyId: `ak_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
        name: 'Default API Key',
        key: crypto.randomBytes(32).toString('hex'),
        permissions: ['read', 'write']
      };
      
      this.apiKeys.push(apiKey);
    }
    
    // Update activity
    if (!this.activity) this.activity = {};
    this.activity.lastActivity = new Date();
    
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-remove middleware for soft delete
advancedUserSchema.pre('remove', function(next) {
  this.deletedAt = new Date();
  next();
});

// ==================== METHODS ====================

// Instance Methods
advancedUserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

advancedUserSchema.methods.generateAuthToken = function(expiresIn = '7d') {
  const payload = {
    userId: this._id,
    email: this.email,
    role: this.role,
    tier: this.subscription?.tier || 'free'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

advancedUserSchema.methods.generateRefreshToken = function() {
  const payload = {
    userId: this._id,
    type: 'refresh'
  };
  
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
};

advancedUserSchema.methods.generateTOTPSecret = function() {
  const secret = speakeasy.generateSecret({
    name: `QR Generator (${this.email})`,
    issuer: 'QR Generator App',
    length: 32
  });
  
  this.security.twoFactorAuth.secret = secret.base32;
  return secret;
};

advancedUserSchema.methods.verifyTOTP = function(token) {
  return speakeasy.totp.verify({
    secret: this.security.twoFactorAuth.secret,
    encoding: 'base32',
    token,
    window: 2
  });
};

advancedUserSchema.methods.generateBackupCodes = function() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  
  this.security.twoFactorAuth.backupCodes = codes.map(code => 
    bcrypt.hashSync(code, 10)
  );
  
  return codes;
};

advancedUserSchema.methods.incrementLoginAttempt = function() {
  // If we have a previous failed attempt, but it's been more than 2 hours, reset
  if (this.security?.loginAttempts?.lastFailedAt && 
      Date.now() - this.security.loginAttempts.lastFailedAt > 2 * 60 * 60 * 1000) {
    this.security.loginAttempts.failed = 0;
  }
  
  if (!this.security) this.security = {};
  if (!this.security.loginAttempts) this.security.loginAttempts = { failed: 0 };
  
  this.security.loginAttempts.failed += 1;
  this.security.loginAttempts.lastFailedAt = new Date();
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.security.loginAttempts.failed >= 5) {
    this.security.loginAttempts.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000);
    this.status = USER_STATUS.LOCKED;
  }
  
  return this.save();
};

advancedUserSchema.methods.resetLoginAttempts = function() {
  if (!this.security?.loginAttempts) return;
  
  this.security.loginAttempts.failed = 0;
  this.security.loginAttempts.lockoutUntil = undefined;
  this.security.loginAttempts.successfulLogins += 1;
  this.security.loginAttempts.lastSuccessfulAt = new Date();
  
  if (this.status === USER_STATUS.LOCKED) {
    this.status = USER_STATUS.ACTIVE;
  }
  
  return this.save();
};

advancedUserSchema.methods.isLocked = function() {
  return this.security?.loginAttempts?.lockoutUntil && 
         this.security.loginAttempts.lockoutUntil > Date.now();
};

advancedUserSchema.methods.addSession = function(sessionData) {
  if (!this.security.sessions) this.security.sessions = [];
  
  const session = {
    sessionId: uuidv4(),
    deviceInfo: sessionData.deviceInfo,
    location: sessionData.location,
    createdAt: new Date(),
    lastActivity: new Date(),
    isActive: true
  };
  
  this.security.sessions.push(session);
  
  // Keep only last 10 sessions
  if (this.security.sessions.length > 10) {
    this.security.sessions.shift();
  }
  
  return session.sessionId;
};

advancedUserSchema.methods.revokeSession = function(sessionId) {
  if (!this.security?.sessions) return false;
  
  const session = this.security.sessions.id(sessionId);
  if (session) {
    session.isActive = false;
    return true;
  }
  
  return false;
};

advancedUserSchema.methods.revokeAllSessions = function() {
  if (!this.security?.sessions) return;
  
  this.security.sessions.forEach(session => {
    session.isActive = false;
  });
};

advancedUserSchema.methods.updateUsage = function(type, increment = 1) {
  if (!this.subscription?.usage) return;
  
  switch (type) {
    case 'qrCodes':
      this.subscription.usage.qrCodesCreated += increment;
      break;
    case 'scans':
      this.subscription.usage.totalScans += increment;
      break;
    case 'apiCalls':
      this.subscription.usage.apiCallsUsed += increment;
      break;
  }
  
  this.activity.lastActivity = new Date();
  return this.save();
};

advancedUserSchema.methods.canCreateQRCode = function() {
  const usage = this.subscription?.usage || {};
  const limits = this.subscription?.limits || {};
  
  return usage.qrCodesCreated < (limits.maxQRCodes || 50);
};

advancedUserSchema.methods.softDelete = function(reason, deletedBy) {
  this.deletedAt = new Date();
  this.deletionReason = reason;
  this.deletedBy = deletedBy;
  this.status = USER_STATUS.DELETED;
  return this.save();
};

// Static Methods
advancedUserSchema.statics.findActive = function() {
  return this.find({ 
    status: { $ne: USER_STATUS.DELETED },
    deletedAt: { $exists: false }
  });
};

advancedUserSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase(),
    deletedAt: { $exists: false }
  });
};

advancedUserSchema.statics.getSubscriptionStats = async function() {
  return this.aggregate([
    { $match: { deletedAt: { $exists: false } } },
    {
      $group: {
        _id: '$subscription.tier',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$subscription.billing.lastPayment.amount' }
      }
    }
  ]);
};

advancedUserSchema.statics.cleanupExpiredTrials = function() {
  return this.updateMany(
    {
      'subscription.trialEndDate': { $lt: new Date() },
      'subscription.tier': 'trial'
    },
    {
      $set: { 
        'subscription.tier': 'free',
        'subscription.status': 'active'
      }
    }
  );
};

// Query Helpers
advancedUserSchema.query.byRole = function(role) {
  return this.where({ role });
};

advancedUserSchema.query.byStatus = function(status) {
  return this.where({ status });
};

advancedUserSchema.query.active = function() {
  return this.where({ 
    status: USER_STATUS.ACTIVE,
    deletedAt: { $exists: false }
  });
};

// ==================== ERROR HANDLING ====================
advancedUserSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    next(new Error(`${field} already exists`));
  } else {
    next(error);
  }
});

// ==================== EXPORT ====================
module.exports = mongoose.model('User', advancedUserSchema);
