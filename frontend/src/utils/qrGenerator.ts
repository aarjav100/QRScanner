import QRCode, { QRCodeToDataURLOptions } from 'qrcode';
import { WiFiConfig } from '../types';

// ==================== TYPES & INTERFACES ====================

export type SecurityType = 'WPA' | 'WPA2' | 'WPA3' | 'WEP' | 'nopass';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'webp';

export interface QROptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: ErrorCorrectionLevel;
  color?: {
    dark?: string;
    light?: string;
  };
}

export interface EnhancedWiFiConfig extends WiFiConfig {
  security: SecurityType;
  encryption?: 'TKIP' | 'CCMP' | 'auto';
  band?: '2.4GHz' | '5GHz' | 'dual';
  priority?: number;
}

export interface DownloadOptions {
  format?: ImageFormat;
  quality?: number;
  timestamp?: boolean;
  prefix?: string;
  compression?: 'none' | 'low' | 'medium' | 'high';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  capacityUsage: number;
}

export interface QRMetadata {
  size: number;
  format: string;
  generatedAt: Date;
  processingTime: number;
  contentLength: number;
}

// ==================== CONSTANTS & UTILITIES ====================

const QR_CAPACITY_LIMITS = {
  'L': { numeric: 7089, alphanumeric: 4296, binary: 2953 },
  'M': { numeric: 5596, alphanumeric: 3391, binary: 2331 },
  'Q': { numeric: 3993, alphanumeric: 2420, binary: 1663 },
  'H': { numeric: 3057, alphanumeric: 1852, binary: 1273 }
};

const CONTENT_PATTERNS = {
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  wifi: /^WIFI:T:(WPA|WPA2|WPA3|WEP|nopass);S:([^;]*);P:([^;]*);H:(true|false);;$/
};

class QRCodeError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'QRCodeError';
  }
}

class PerformanceMonitor {
  private static metrics = new Map<string, { count: number; totalTime: number; avgTime: number }>();
  
  static startTimer(operation: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.updateMetrics(operation, duration);
      return duration;
    };
  }
  
  private static updateMetrics(operation: string, duration: number): void {
    const current = this.metrics.get(operation) || { count: 0, totalTime: 0, avgTime: 0 };
    current.count++;
    current.totalTime += duration;
    current.avgTime = current.totalTime / current.count;
    this.metrics.set(operation, current);
  }
  
  static getMetrics(): Record<string, { count: number; totalTime: number; avgTime: number }> {
    return Object.fromEntries(this.metrics);
  }
}

class QRCodeCache {
  private static cache = new Map<string, { result: string; metadata: QRMetadata; timestamp: number }>();
  private static readonly TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_SIZE = 100;

  static get(key: string): { result: string; metadata: QRMetadata } | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return { result: cached.result, metadata: cached.metadata };
    }
    this.cache.delete(key);
    return null;
  }

  static set(key: string, result: string, metadata: QRMetadata): void {
    if (this.cache.size >= this.MAX_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { result, metadata, timestamp: Date.now() });
  }

  static clear(): void {
    this.cache.clear();
  }

  static getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_SIZE,
      hitRate: 0 // Would need to track hits/misses for accurate calculation
    };
  }
}

// ==================== CORE FUNCTIONS (KEEPING ORIGINAL LOGIC) ====================

export const generateQRCode = async (content: string, options: QROptions = {}): Promise<string> => {
  const endTimer = PerformanceMonitor.startTimer('generateQRCode');
  
  // Input validation
  if (!content?.trim()) {
    throw new QRCodeError('Content cannot be empty', 'EMPTY_CONTENT');
  }

  // Check cache first
  const cacheKey = JSON.stringify({ content, options });
  const cached = QRCodeCache.get(cacheKey);
  if (cached) {
    endTimer();
    return cached.result;
  }

  try {
    // ORIGINAL QR GENERATION CODE - UNCHANGED
    const qrCodeUrl = await QRCode.toDataURL(content, {
      width: options.width || 300,
      margin: options.margin || 2,
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      color: {
        dark: options.color?.dark || '#000000',
        light: options.color?.light || '#FFFFFF'
      }
    });

    // Store in cache with metadata
    const processingTime = endTimer();
    const metadata: QRMetadata = {
      size: Math.round((qrCodeUrl.length * 3) / 4),
      format: 'image/png',
      generatedAt: new Date(),
      processingTime,
      contentLength: content.length
    };

    QRCodeCache.set(cacheKey, qrCodeUrl, metadata);
    return qrCodeUrl;
  } catch (error) {
    endTimer();
    console.error('Error generating QR code:', error);
    throw new QRCodeError(
      `Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GENERATION_FAILED',
      { content: content.substring(0, 100), options }
    );
  }
};

// ==================== ENHANCED WIFI FUNCTIONS ====================

export const validateWiFiConfig = (config: WiFiConfig | EnhancedWiFiConfig): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // SSID validation
  if (!config?.ssid?.trim()) {
    errors.push('WiFi SSID is required and cannot be empty');
  } else {
    if (config.ssid.length > 32) {
      errors.push('SSID cannot exceed 32 characters');
    }
    if (config.ssid.includes(';') || config.ssid.includes(':') || config.ssid.includes(',')) {
      warnings.push('SSID contains special characters that may cause issues');
    }
  }

  // Security validation
  const validSecurityTypes = ['WPA', 'WPA2', 'WPA3', 'WEP', 'nopass', ''];
  if (config.security && !validSecurityTypes.includes(config.security)) {
    errors.push('Invalid security type. Use WPA, WPA2, WPA3, WEP, or nopass');
  }

  // Password validation
  if (config.security && config.security !== 'nopass' && !config.password) {
    errors.push('Password is required for secured networks');
  } else if (config.password) {
    if (config.security?.startsWith('WPA') && config.password.length < 8) {
      warnings.push('WPA passwords should be at least 8 characters long');
    }
    if (config.password.length > 63) {
      errors.push('Password cannot exceed 63 characters');
    }
  }

  // Security recommendations
  if (config.security === 'WEP') {
    warnings.push('WEP encryption is deprecated and insecure');
    suggestions.push('Consider upgrading to WPA2 or WPA3 for better security');
  }

  if (config.security === 'nopass') {
    warnings.push('Open network without password poses security risks');
    suggestions.push('Consider adding password protection');
  }

  // Calculate capacity usage
  const wifiString = createWiFiString(config);
  const capacityUsage = (wifiString.length / QR_CAPACITY_LIMITS.M.binary) * 100;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    capacityUsage
  };
};

const createWiFiString = (config: WiFiConfig | EnhancedWiFiConfig): string => {
  // Enhanced string escaping for WiFi format
  const escapeWiFiString = (str: string = ''): string => {
    return str
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/"/g, '\\"')    // Escape quotes
      .replace(/;/g, '\\;')    // Escape semicolons
      .replace(/,/g, '\\,')    // Escape commas
      .replace(/:/g, '\\:');   // Escape colons
  };

  return `WIFI:T:${config.security || 'nopass'};S:${escapeWiFiString(config.ssid)};P:${escapeWiFiString(config.password || '')};H:${config.hidden === true};;`;
};

export const generateWiFiQRCode = async (config: WiFiConfig | EnhancedWiFiConfig, options: QROptions = {}): Promise<string> => {
  const endTimer = PerformanceMonitor.startTimer('generateWiFiQRCode');
  
  try {
    // Validate configuration
    const validation = validateWiFiConfig(config);
    if (!validation.isValid) {
      throw new QRCodeError(
        `Invalid WiFi configuration: ${validation.errors.join(', ')}`,
        'INVALID_WIFI_CONFIG',
        { config, validation }
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('WiFi QR Code Warnings:', validation.warnings);
    }

    // Generate WiFi string with enhanced escaping
    const wifiString = createWiFiString(config);
    
    // Use enhanced options for WiFi QR codes
    const wifiOptions: QROptions = {
      errorCorrectionLevel: 'M', // Recommended for WiFi
      width: 400, // Larger for better scanning
      ...options
    };

    const result = await generateQRCode(wifiString, wifiOptions);
    endTimer();
    return result;
  } catch (error) {
    endTimer();
    if (error instanceof QRCodeError) throw error;
    throw new QRCodeError(
      `WiFi QR generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'WIFI_GENERATION_FAILED',
      { config }
    );
  }
};

// ==================== ENHANCED DOWNLOAD FUNCTIONS ====================

export const downloadQRCode = async (
  qrCodeUrl: string, 
  filename: string, 
  options: DownloadOptions = {}
): Promise<void> => {
  const endTimer = PerformanceMonitor.startTimer('downloadQRCode');
  
  try {
    // Input validation
    if (!qrCodeUrl?.trim() || !filename?.trim()) {
      throw new QRCodeError('QR code URL and filename are required', 'INVALID_DOWNLOAD_PARAMS');
    }

    const {
      format = 'png',
      quality = 0.92,
      timestamp = false,
      prefix = '',
      compression = 'medium'
    } = options;

    let finalDataUrl = qrCodeUrl;

    // Convert format or apply compression if needed
    if (format !== 'png' || compression !== 'none') {
      finalDataUrl = await processImageForDownload(qrCodeUrl, format, quality, compression);
    }

    // Generate enhanced filename
    const timestampStr = timestamp ? `_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}` : '';
    const prefixStr = prefix ? `${prefix}_` : '';
    const extension = format === 'jpg' ? 'jpg' : format;
    const finalFilename = `${prefixStr}${filename}${timestampStr}.${extension}`;

    // Perform download with modern approach
    await performEnhancedDownload(finalDataUrl, finalFilename);
    
    endTimer();
    
  } catch (error) {
    endTimer();
    throw new QRCodeError(
      `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DOWNLOAD_FAILED',
      { filename, options }
    );
  }
};

const processImageForDownload = async (
  dataUrl: string,
  format: ImageFormat,
  quality: number,
  compression: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new QRCodeError('Canvas context unavailable', 'CANVAS_ERROR'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Apply compression
      let finalQuality = quality;
      switch (compression) {
        case 'high': finalQuality *= 0.7; break;
        case 'medium': finalQuality *= 0.85; break;
        case 'low': finalQuality *= 0.95; break;
      }

      const mimeType = format === 'jpg' || format === 'jpeg' ? 'image/jpeg' : 
                      format === 'webp' ? 'image/webp' : 'image/png';
      
      resolve(canvas.toDataURL(mimeType, finalQuality));
    };

    img.onerror = () => reject(new QRCodeError('Image processing failed', 'IMAGE_PROCESS_ERROR'));
    img.src = dataUrl;
  });
};

const performEnhancedDownload = async (dataUrl: string, filename: string): Promise<void> => {
  try {
    // Convert data URL to blob for better browser compatibility
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch QR code: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    // Use File System Access API if available (modern browsers)
    if ('showSaveFilePicker' in window) {
      try {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'Images',
            accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }
          }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        URL.revokeObjectURL(url);
        return;
      } catch (e) {
        // User cancelled or API not supported, fall back to traditional method
      }
    }

    // ORIGINAL DOWNLOAD LOGIC - ENHANCED
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.position = 'absolute';
    link.style.left = '-9999px';
    link.style.visibility = 'hidden';
    link.setAttribute('aria-hidden', 'true');
    
    document.body.appendChild(link);
    link.click();
    
    // Enhanced cleanup with timeout
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 100);

  } catch (error) {
    throw new QRCodeError(
      `Download operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DOWNLOAD_OPERATION_FAILED'
    );
  }
};

// ==================== UTILITY FUNCTIONS ====================

export const validateQRContent = (
  content: string,
  errorCorrectionLevel: ErrorCorrectionLevel = 'M'
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!content) {
    errors.push('Content cannot be empty');
    return { isValid: false, errors, warnings, suggestions, capacityUsage: 0 };
  }

  const limits = QR_CAPACITY_LIMITS[errorCorrectionLevel];
  let capacity: number;

  // Determine content type and appropriate capacity
  if (/^[0-9]+$/.test(content)) {
    capacity = limits.numeric;
  } else if (/^[0-9A-Z $%*+\-./:]+$/.test(content)) {
    capacity = limits.alphanumeric;
  } else {
    capacity = limits.binary;
  }

  const capacityUsage = (content.length / capacity) * 100;

  if (capacityUsage > 100) {
    errors.push(`Content exceeds ${errorCorrectionLevel} capacity (${capacityUsage.toFixed(1)}%)`);
    suggestions.push('Try using a higher error correction level or reduce content length');
  } else if (capacityUsage > 85) {
    warnings.push(`High capacity usage (${capacityUsage.toFixed(1)}%)`);
    suggestions.push('Consider optimizing content length for better reliability');
  }

  // Content format validations
  if (content.startsWith('http') && !CONTENT_PATTERNS.url.test(content)) {
    warnings.push('URL format may not be recognized by all QR scanners');
  }

  if (content.includes('@') && !CONTENT_PATTERNS.email.test(content)) {
    warnings.push('Email format may not be valid');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    capacityUsage
  };
};

export const getQRCodeMetadata = (content: string, options: QROptions = {}): QRMetadata => {
  return {
    size: 0, // Will be calculated after generation
    format: 'image/png',
    generatedAt: new Date(),
    processingTime: 0, // Will be calculated during generation
    contentLength: content.length
  };
};

export const clearQRCache = (): void => {
  QRCodeCache.clear();
};

export const getPerformanceMetrics = (): Record<string, any> => {
  return {
    ...PerformanceMonitor.getMetrics(),
    cache: QRCodeCache.getStats()
  };
};

// ==================== BATCH OPERATIONS ====================

export const generateBatchQRCodes = async (
  contents: Array<{ content: string; filename?: string; options?: QROptions }>,
  concurrency: number = 5
): Promise<{ successful: string[]; failed: Array<{ content: string; error: Error }> }> => {
  if (!Array.isArray(contents) || contents.length === 0) {
    throw new QRCodeError('Contents array cannot be empty', 'EMPTY_BATCH');
  }

  const successful: string[] = [];
  const failed: Array<{ content: string; error: Error }> = [];

  // Process in batches with concurrency control
  const semaphore = new Array(concurrency).fill(null).map(() => Promise.resolve());
  let semaphoreIndex = 0;

  const processItem = async (item: typeof contents[0]) => {
    try {
      const result = await generateQRCode(item.content, item.options);
      successful.push(result);
    } catch (error) {
      failed.push({ 
        content: item.content, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      });
    }
  };

  const promises = contents.map(async (item) => {
    await semaphore[semaphoreIndex];
    const currentIndex = semaphoreIndex;
    semaphoreIndex = (semaphoreIndex + 1) % concurrency;
    
    semaphore[currentIndex] = processItem(item);
    return semaphore[currentIndex];
  });

  await Promise.allSettled(promises);
  return { successful, failed };
};

// ==================== EXPORT ====================

export {
  QRCodeError,
  QRCodeCache,
  PerformanceMonitor,
  type QROptions,
  type EnhancedWiFiConfig,
  type DownloadOptions,
  type ValidationResult,
  type QRMetadata
};
