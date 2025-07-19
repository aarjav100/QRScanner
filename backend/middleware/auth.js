const jwt = require('jsonwebtoken');
const redis = require('redis');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const crypto = require('crypto');
const { promisify } = require('util');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const BlacklistedToken = require('../models/BlacklistedToken');
const DeviceFingerprint = require('../models/DeviceFingerprint');

// ==================== REDIS CLIENT SETUP ====================
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

// ==================== CONSTANTS & CONFIGURATION ====================
const AUTH_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  MAX_CONCURRENT_SESSIONS: parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 5,
  ENABLE_DEVICE_TRACKING: process.env.ENABLE_DEVICE_TRACKING === 'true',
  ENABLE_GEOLOCATION_CHECK: process.env.ENABLE_GEOLOCATION_CHECK === 'true',
  SUSPICIOUS_ACTIVITY_THRESHOLD: parseInt(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD) || 5,
  TOKEN_BLACKLIST_TTL: 86400, // 24 hours in seconds
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  SLOW_DOWN_DELAY_AFTER: 50,
  SLOW_DOWN_DELAY_MS: 1000
};

// ==================== ERROR CLASSES ====================
class AuthError extends Error {
  constructor(message, code, statusCode = 401, details = {}) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class SecurityError extends Error {
  constructor(message, code, severity = 'HIGH', details = {}) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// ==================== UTILITY FUNCTIONS ====================
class SecurityUtils {
  static generateDeviceFingerprint(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const ip = this.getClientIP(req);
    
    const fingerprintData = `${userAgent}:${acceptLanguage}:${acceptEncoding}:${ip}`;
    return crypto.createHash('sha256').update(fingerprintData).digest('hex');
  }

  static getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';
  }

  static async getGeolocationInfo(ip) {
    try {
      // Mock implementation - integrate with actual geolocation service
      if (ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('192.168.')) {
        return { country: 'Local', region: 'Local', city: 'Local' };
      }
      
      // Integrate with services like MaxMind, IPStack, etc.
      return { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
    } catch (error) {
      console.error('Geolocation lookup failed:', error);
      return { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
    }
  }

  static sanitizeUserAgent(userAgent) {
    return userAgent?.replace(/[<>]/g, '').substring(0, 500) || 'Unknown';
  }

  static async encryptSensitiveData(data) {
    const key = crypto.scryptSync(AUTH_CONFIG.JWT_SECRET, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key);
    cipher.setAAD(Buffer.from('auth-middleware', 'utf8'));
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
}

// ==================== REDIS OPERATIONS ====================
class RedisManager {
  static async get(key) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  static async set(key, value, ttl = 3600) {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  static async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  static async increment(key, ttl = 3600) {
    try {
      const multi = redisClient.multi();
      multi.incr(key);
      multi.expire(key, ttl);
      const results = await multi.exec();
      return results[0][1];
    } catch (error) {
      console.error('Redis INCREMENT error:', error);
      return 0;
    }
  }
}

// ==================== SESSION MANAGEMENT ====================
class SessionManager {
  static async createSession(userId, deviceFingerprint, req) {
    const sessionId = crypto.randomUUID();
    const ip = SecurityUtils.getClientIP(req);
    const userAgent = SecurityUtils.sanitizeUserAgent(req.headers['user-agent']);
    const geoLocation = await SecurityUtils.getGeolocationInfo(ip);
    
    const sessionData = {
      sessionId,
      userId: userId.toString(),
      deviceFingerprint,
      ip,
      userAgent,
      geoLocation,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true
    };

    await RedisManager.set(`session:${sessionId}`, sessionData, 86400 * 7); // 7 days
    await this.addUserSession(userId, sessionId);
    
    return sessionId;
  }

  static async addUserSession(userId, sessionId) {
    const userSessionsKey = `user_sessions:${userId}`;
    const sessions = await RedisManager.get(userSessionsKey) || [];
    
    sessions.push(sessionId);
    
    // Limit concurrent sessions
    if (sessions.length > AUTH_CONFIG.MAX_CONCURRENT_SESSIONS) {
      const oldestSession = sessions.shift();
      await this.invalidateSession(oldestSession);
    }
    
    await RedisManager.set(userSessionsKey, sessions, 86400 * 7);
  }

  static async validateSession(sessionId) {
    const session = await RedisManager.get(`session:${sessionId}`);
    
    if (!session || !session.isActive) {
      return null;
    }

    // Update last activity
    session.lastActivity = new Date();
    await RedisManager.set(`session:${sessionId}`, session, 86400 * 7);
    
    return session;
  }

  static async invalidateSession(sessionId) {
    await RedisManager.del(`session:${sessionId}`);
  }

  static async invalidateAllUserSessions(userId) {
    const userSessionsKey = `user_sessions:${userId}`;
    const sessions = await RedisManager.get(userSessionsKey) || [];
    
    for (const sessionId of sessions) {
      await this.invalidateSession(sessionId);
    }
    
    await RedisManager.del(userSessionsKey);
  }
}

// ==================== AUDIT LOGGING ====================
class AuditLogger {
  static async logAuthAttempt(req, success, userId = null, error = null) {
    try {
      const logData = {
        timestamp: new Date(),
        ip: SecurityUtils.getClientIP(req),
        userAgent: SecurityUtils.sanitizeUserAgent(req.headers['user-agent']),
        deviceFingerprint: SecurityUtils.generateDeviceFingerprint(req),
        success,
        userId,
        error: error?.message || null,
        errorCode: error?.code || null,
        geoLocation: await SecurityUtils.getGeolocationInfo(SecurityUtils.getClientIP(req)),
        headers: {
          origin: req.headers.origin,
          referer: req.headers.referer,
          'accept-language': req.headers['accept-language']
        }
      };

      // Save to database (implement AuditLog model)
      if (AuditLog) {
        await AuditLog.create(logData);
      }

      // Also log to Redis for quick access
      const auditKey = `audit:${Date.now()}:${crypto.randomUUID()}`;
      await RedisManager.set(auditKey, logData, 86400 * 30); // 30 days

      // Log suspicious activity
      if (!success) {
        await this.trackSuspiciousActivity(req);
      }

    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  static async trackSuspiciousActivity(req) {
    const ip = SecurityUtils.getClientIP(req);
    const suspiciousActivityKey = `suspicious:${ip}`;
    
    const count = await RedisManager.increment(suspiciousActivityKey, 3600); // 1 hour window
    
    if (count >= AUTH_CONFIG.SUSPICIOUS_ACTIVITY_THRESHOLD) {
      // Trigger security alert
      await this.triggerSecurityAlert(ip, count, req);
    }
  }

  static async triggerSecurityAlert(ip, attemptCount, req) {
    const alertData = {
      type: 'SUSPICIOUS_ACTIVITY',
      ip,
      attemptCount,
      timestamp: new Date(),
      userAgent: req.headers['user-agent'],
      deviceFingerprint: SecurityUtils.generateDeviceFingerprint(req),
      geoLocation: await SecurityUtils.getGeolocationInfo(ip)
    };

    // Send to security monitoring system
    console.warn('🚨 SECURITY ALERT:', alertData);
    
    // Block IP temporarily
    await RedisManager.set(`blocked_ip:${ip}`, true, 3600); // Block for 1 hour
  }
}

// ==================== TOKEN MANAGEMENT ====================
class TokenManager {
  static generateTokenPair(payload) {
    const accessToken = jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, {
      expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
      issuer: process.env.APP_NAME || 'auth-service',
      audience: process.env.APP_DOMAIN || 'localhost'
    });

    const refreshToken = jwt.sign(
      { userId: payload.userId, type: 'refresh' },
      AUTH_CONFIG.JWT_REFRESH_SECRET,
      {
        expiresIn: AUTH_CONFIG.REFRESH_TOKEN_EXPIRY,
        issuer: process.env.APP_NAME || 'auth-service',
        audience: process.env.APP_DOMAIN || 'localhost'
      }
    );

    return { accessToken, refreshToken };
  }

  static async isTokenBlacklisted(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const blacklisted = await RedisManager.get(`blacklist:${tokenHash}`);
    return !!blacklisted;
  }

  static async blacklistToken(token, expiry) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const ttl = Math.max(0, Math.floor((expiry * 1000 - Date.now()) / 1000));
    
    if (ttl > 0) {
      await RedisManager.set(`blacklist:${tokenHash}`, true, ttl);
    }
  }

  static verifyToken(token, secret = AUTH_CONFIG.JWT_SECRET) {
    return jwt.verify(token, secret, {
      issuer: process.env.APP_NAME || 'auth-service',
      audience: process.env.APP_DOMAIN || 'localhost'
    });
  }
}

// ==================== RATE LIMITING ====================
const createAuthRateLimiter = () => {
  return rateLimit({
    windowMs: AUTH_CONFIG.RATE_LIMIT_WINDOW,
    max: AUTH_CONFIG.RATE_LIMIT_MAX_REQUESTS,
    message: {
      success: false,
      message: 'Too many authentication requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return SecurityUtils.getClientIP(req);
    },
    skip: (req) => {
      // Skip rate limiting for trusted IPs
      const trustedIPs = (process.env.TRUSTED_IPS || '').split(',');
      return trustedIPs.includes(SecurityUtils.getClientIP(req));
    }
  });
};

const createAuthSlowDown = () => {
  return slowDown({
    windowMs: AUTH_CONFIG.RATE_LIMIT_WINDOW,
    delayAfter: AUTH_CONFIG.SLOW_DOWN_DELAY_AFTER,
    delayMs: () => 1000,
    keyGenerator: (req) => SecurityUtils.getClientIP(req)
  });
};

// ==================== DEVICE FINGERPRINTING ====================
class DeviceManager {
  static async validateDeviceFingerprint(userId, currentFingerprint) {
    if (!AUTH_CONFIG.ENABLE_DEVICE_TRACKING) {
      return true;
    }

    try {
      const knownDevices = await RedisManager.get(`known_devices:${userId}`) || [];
      
      if (knownDevices.includes(currentFingerprint)) {
        return true;
      }

      // If it's a new device, you might want to require additional verification
      // For now, we'll add it to known devices
      knownDevices.push(currentFingerprint);
      
      // Keep only the last 10 devices
      if (knownDevices.length > 10) {
        knownDevices.shift();
      }

      await RedisManager.set(`known_devices:${userId}`, knownDevices, 86400 * 30);
      return true;
    } catch (error) {
      console.error('Device validation error:', error);
      return true; // Fail open for availability
    }
  }
}

// ==================== MAIN AUTHENTICATION MIDDLEWARE ====================
const advancedAuth = async (req, res, next) => {
  const startTime = Date.now();
  let userId = null;

  try {
    // ==================== IP BLOCKING CHECK ====================
    const clientIP = SecurityUtils.getClientIP(req);
    const isBlocked = await RedisManager.get(`blocked_ip:${clientIP}`);
    
    if (isBlocked) {
      throw new SecurityError(
        'IP address temporarily blocked due to suspicious activity',
        'IP_BLOCKED',
        'HIGH',
        { ip: clientIP }
      );
    }

    // ==================== TOKEN EXTRACTION & VALIDATION ====================
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '')?.trim();
    
    if (!token) {
      throw new AuthError(
        'Access denied. No authentication token provided.',
        'NO_TOKEN',
        401
      );
    }

    // Check if token is blacklisted
    if (await TokenManager.isTokenBlacklisted(token)) {
      throw new AuthError(
        'Token has been revoked.',
        'TOKEN_BLACKLISTED',
        401
      );
    }

    // ==================== JWT VERIFICATION ====================
    let decoded;
    try {
      decoded = TokenManager.verifyToken(token);
      userId = decoded.userId;
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        throw new AuthError(
          'Authentication token has expired.',
          'TOKEN_EXPIRED',
          401,
          { expiredAt: jwtError.expiredAt }
        );
      } else if (jwtError.name === 'JsonWebTokenError') {
        throw new AuthError(
          'Invalid authentication token.',
          'INVALID_TOKEN',
          401
        );
      } else {
        throw new AuthError(
          'Token verification failed.',
          'TOKEN_VERIFICATION_FAILED',
          401
        );
      }
    }

    // ==================== SESSION VALIDATION ====================
    if (decoded.sessionId) {
      const session = await SessionManager.validateSession(decoded.sessionId);
      if (!session) {
        throw new AuthError(
          'Session expired or invalid.',
          'INVALID_SESSION',
          401
        );
      }

      // Validate session IP (optional strict mode)
      if (process.env.STRICT_IP_VALIDATION === 'true' && session.ip !== clientIP) {
        throw new SecurityError(
          'Session IP mismatch detected.',
          'IP_MISMATCH',
          'HIGH',
          { sessionIP: session.ip, currentIP: clientIP }
        );
      }
    }

    // ==================== USER LOOKUP & VALIDATION ====================
    const user = await User.findById(decoded.userId).select('-password +isActive +lastLogin +securitySettings');
    
    if (!user) {
      throw new AuthError(
        'User account not found.',
        'USER_NOT_FOUND',
        401
      );
    }

    if (!user.isActive) {
      throw new AuthError(
        'User account has been deactivated.',
        'ACCOUNT_DEACTIVATED',
        401
      );
    }

    // ==================== DEVICE FINGERPRINTING ====================
    const deviceFingerprint = SecurityUtils.generateDeviceFingerprint(req);
    const isKnownDevice = await DeviceManager.validateDeviceFingerprint(user._id, deviceFingerprint);
    
    if (!isKnownDevice && process.env.STRICT_DEVICE_VALIDATION === 'true') {
      throw new SecurityError(
        'Unrecognized device detected.',
        'UNKNOWN_DEVICE',
        'MEDIUM',
        { deviceFingerprint }
      );
    }

    // ==================== ROLE & PERMISSION VALIDATION ====================
    if (req.route?.path && user.permissions) {
      const requiredPermission = req.route.path.replace('/', '').split('/')[0];
      if (requiredPermission && !user.permissions.includes(requiredPermission)) {
        throw new AuthError(
          'Insufficient permissions for this resource.',
          'INSUFFICIENT_PERMISSIONS',
          403
        );
      }
    }

    // ==================== CONCURRENT SESSION CHECK ====================
    const activeSessionsCount = (await RedisManager.get(`user_sessions:${user._id}`))?.length || 0;
    if (activeSessionsCount > AUTH_CONFIG.MAX_CONCURRENT_SESSIONS) {
      throw new AuthError(
        'Maximum concurrent sessions exceeded.',
        'SESSION_LIMIT_EXCEEDED',
        429
      );
    }

    // ==================== REQUEST ENHANCEMENT ====================
    req.user = {
      ...user.toObject(),
      sessionId: decoded.sessionId,
      deviceFingerprint,
      clientIP,
      tokenIssuedAt: new Date(decoded.iat * 1000),
      tokenExpiresAt: new Date(decoded.exp * 1000)
    };

    req.securityContext = {
      authMethod: 'JWT',
      deviceTrusted: isKnownDevice,
      sessionDuration: Date.now() - new Date(decoded.iat * 1000).getTime(),
      riskScore: 'LOW', // You can implement risk scoring logic
      geoLocation: await SecurityUtils.getGeolocationInfo(clientIP)
    };

    // ==================== AUDIT LOGGING ====================
    await AuditLogger.logAuthAttempt(req, true, user._id);

    // ==================== PERFORMANCE METRICS ====================
    const authDuration = Date.now() - startTime;
    res.set('X-Auth-Duration', `${authDuration}ms`);

    // Update user's last activity
    await User.findByIdAndUpdate(user._id, { 
      lastActivity: new Date(),
      lastIP: clientIP
    });

    next();

  } catch (error) {
    // ==================== ERROR HANDLING & LOGGING ====================
    const authDuration = Date.now() - startTime;
    
    await AuditLogger.logAuthAttempt(req, false, userId, error);

    // Set security headers
    res.set({
      'X-Auth-Duration': `${authDuration}ms`,
      'X-Auth-Error': error.code || 'UNKNOWN_ERROR'
    });

    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
        timestamp: error.timestamp,
        ...(process.env.NODE_ENV === 'development' && { details: error.details })
      });
    }

    if (error instanceof SecurityError) {
      // Log security incidents
      console.error('🚨 SECURITY INCIDENT:', {
        error: error.message,
        severity: error.severity,
        code: error.code,
        details: error.details,
        ip: SecurityUtils.getClientIP(req),
        timestamp: error.timestamp
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied due to security policy.',
        code: error.code,
        timestamp: error.timestamp
      });
    }

    // ==================== FALLBACK ERROR HANDLING ====================
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
      code: 'INTERNAL_AUTH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

// ==================== MIDDLEWARE VARIANTS ====================

// Strict authentication with all security features enabled
const strictAuth = (req, res, next) => {
  process.env.STRICT_IP_VALIDATION = 'true';
  process.env.STRICT_DEVICE_VALIDATION = 'true';
  return advancedAuth(req, res, next);
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    req.user = null;
    req.securityContext = { authMethod: 'NONE' };
    return next();
  }
  
  return advancedAuth(req, res, next);
};

// Role-based authentication
const requireRole = (roles) => {
  return async (req, res, next) => {
    await advancedAuth(req, res, (error) => {
      if (error) return next(error);
      
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient role permissions.',
          code: 'INSUFFICIENT_ROLE',
          requiredRoles: roles,
          userRole: req.user?.role
        });
      }
      
      next();
    });
  };
};

// ==================== UTILITY FUNCTIONS ====================
const logout = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.decode(token);
      if (decoded?.exp) {
        await TokenManager.blacklistToken(token, decoded.exp);
      }
      
      if (decoded?.sessionId) {
        await SessionManager.invalidateSession(decoded.sessionId);
      }
    }

    if (req.user?.id) {
      await AuditLogger.logAuthAttempt(req, true, req.user.id, { action: 'LOGOUT' });
    }

    res.json({
      success: true,
      message: 'Successfully logged out.'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout.'
    });
  }
};

const logoutAllSessions = async (req, res) => {
  try {
    if (req.user?.id) {
      await SessionManager.invalidateAllUserSessions(req.user.id);
      await AuditLogger.logAuthAttempt(req, true, req.user.id, { action: 'LOGOUT_ALL' });
    }

    res.json({
      success: true,
      message: 'All sessions terminated successfully.'
    });
  } catch (error) {
    console.error('Logout all sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error terminating sessions.'
    });
  }
};

// ==================== EXPORTS ====================
module.exports = {
  // Main middleware
  auth: advancedAuth,
  
  // Middleware variants
  strictAuth,
  optionalAuth,
  requireRole,
  
  // Rate limiting middleware
  authRateLimit: createAuthRateLimiter(),
  authSlowDown: createAuthSlowDown(),
  
  // Utility functions
  logout,
  logoutAllSessions,
  
  // Classes for external use
  TokenManager,
  SessionManager,
  SecurityUtils,
  AuditLogger,
  RedisManager,
  
  // Configuration
  AUTH_CONFIG
};
