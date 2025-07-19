import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Wifi, Eye, EyeOff, Download, Save, Shield, Zap, Copy, Check, 
  AlertTriangle, Info, Trash2, RefreshCw, Settings, Star,
  Clock, TrendingUp, Lock, Globe, Radio, QrCode
} from 'lucide-react';
import { generateWiFiQRCode, downloadQRCode, validateWiFiConfig, type QROptions, type ValidationResult } from '../utils/qrGenerator';
import { QRCodeData, WiFiConfig } from '../types';

// ==================== ENHANCED INTERFACES ====================

interface EnhancedWiFiConfig extends WiFiConfig {
  encryption?: 'TKIP' | 'CCMP' | 'auto';
  band?: '2.4GHz' | '5GHz' | 'dual';
  priority?: number;
}

interface QRGenerationStats {
  totalGenerated: number;
  averageTime: number;
  lastGenerated?: Date;
  mostUsedSecurity: string;
}

interface WiFiQRGeneratorProps {
  onSave: (qrData: QRCodeData) => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// ==================== TOAST COMPONENT ====================

const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  useEffect(() => {
    toasts.forEach(toast => {
      const timer = setTimeout(() => removeToast(toast.id), toast.duration || 4000);
      return () => clearTimeout(timer);
    });
  }, [toasts, removeToast]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`p-4 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-300 transform hover:scale-105 ${
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            toast.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {toast.type === 'success' && <Check className="h-4 w-4 text-emerald-600" />}
            {toast.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-600" />}
            {toast.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
            {toast.type === 'info' && <Info className="h-4 w-4 text-blue-600" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const WiFiQRGenerator: React.FC<WiFiQRGeneratorProps> = ({ onSave }) => {
  // ==================== STATE MANAGEMENT ====================
  
  const [config, setConfig] = useState<EnhancedWiFiConfig>({
    ssid: '',
    password: '',
    security: 'WPA',
    hidden: false,
    encryption: 'auto',
    band: 'dual',
    priority: 1
  });

  const [title, setTitle] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [qrOptions, setQrOptions] = useState<QROptions>({
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'M'
  });
  
  // Toast system
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Analytics & Performance
  const [stats, setStats] = useState<QRGenerationStats>({
    totalGenerated: parseInt(localStorage.getItem('wifi-qr-stats-total') || '0'),
    averageTime: parseFloat(localStorage.getItem('wifi-qr-stats-avg-time') || '0'),
    mostUsedSecurity: localStorage.getItem('wifi-qr-stats-security') || 'WPA'
  });

  const [generationHistory, setGenerationHistory] = useState<Array<{
    ssid: string;
    timestamp: Date;
    duration: number;
  }>>([]);

  // ==================== TOAST UTILITIES ====================

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // ==================== VALIDATION & EFFECTS ====================

  const validateCurrentConfig = useCallback(async () => {
    if (config.ssid.trim()) {
      const result = validateWiFiConfig(config);
      setValidation(result);
      
      // Show validation warnings
      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          addToast({ type: 'warning', message: warning });
        });
      }
    } else {
      setValidation(null);
    }
  }, [config, addToast]);

  useEffect(() => {
    const debounceTimer = setTimeout(validateCurrentConfig, 300);
    return () => clearTimeout(debounceTimer);
  }, [validateCurrentConfig]);

  // Save stats to localStorage
  useEffect(() => {
    localStorage.setItem('wifi-qr-stats-total', stats.totalGenerated.toString());
    localStorage.setItem('wifi-qr-stats-avg-time', stats.averageTime.toString());
    localStorage.setItem('wifi-qr-stats-security', stats.mostUsedSecurity);
  }, [stats]);

  // ==================== HANDLERS ====================

  const handleGenerate = async () => {
    if (!config.ssid.trim()) {
      addToast({ type: 'error', message: 'Network name (SSID) is required' });
      return;
    }
    
    if (validation && !validation.isValid) {
      addToast({ type: 'error', message: `Validation failed: ${validation.errors.join(', ')}` });
      return;
    }

    setLoading(true);
    const startTime = performance.now();

    try {
      const qrUrl = await generateWiFiQRCode(config, qrOptions);
      const endTime = performance.now();
      const duration = endTime - startTime;

      setQrCodeUrl(qrUrl);
      
      // Update stats
      setStats(prev => ({
        totalGenerated: prev.totalGenerated + 1,
        averageTime: (prev.averageTime * prev.totalGenerated + duration) / (prev.totalGenerated + 1),
        lastGenerated: new Date(),
        mostUsedSecurity: config.security
      }));

      // Add to history
      setGenerationHistory(prev => [{
        ssid: config.ssid,
        timestamp: new Date(),
        duration
      }, ...prev.slice(0, 4)]);

      addToast({ 
        type: 'success', 
        message: `WiFi QR code generated in ${duration.toFixed(0)}ms` 
      });

    } catch (error) {
      console.error('Error generating WiFi QR code:', error);
      addToast({ 
        type: 'error', 
        message: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!qrCodeUrl || !title.trim()) {
      addToast({ type: 'error', message: 'Title and QR code are required for saving' });
      return;
    }

    const qrData: QRCodeData = {
      id: Date.now().toString(),
      type: 'wifi',
      title: title.trim(),
      content: `WIFI:T:${config.security};S:${config.ssid};P:${config.password};H:${config.hidden};;`,
      createdAt: new Date().toISOString(),
      qrCodeUrl
    };

    onSave(qrData);
    
    // Reset form
    setTitle('');
    setConfig({
      ssid: '',
      password: '',
      security: 'WPA',
      hidden: false,
      encryption: 'auto',
      band: 'dual',
      priority: 1
    });
    setQrCodeUrl('');
    
    addToast({ type: 'success', message: 'WiFi QR code saved successfully!' });
  };

  const handleDownload = async () => {
    if (!qrCodeUrl) return;

    try {
      await downloadQRCode(qrCodeUrl, title || 'wifi-qr', {
        format: 'png',
        quality: 0.95,
        timestamp: true,
        prefix: 'wifi'
      });
      addToast({ type: 'success', message: 'QR code downloaded successfully!' });
    } catch (error) {
      addToast({ type: 'error', message: 'Download failed. Please try again.' });
    }
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({ type: 'success', message: `${label} copied to clipboard!` });
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to copy to clipboard' });
    }
  };

  const handleReset = () => {
    setConfig({
      ssid: '',
      password: '',
      security: 'WPA',
      hidden: false,
      encryption: 'auto',
      band: 'dual',
      priority: 1
    });
    setTitle('');
    setQrCodeUrl('');
    setValidation(null);
    addToast({ type: 'info', message: 'Form reset successfully' });
  };

  // ==================== MEMOIZED VALUES ====================

  const securityOptions = useMemo(() => [
    { 
      value: 'WPA', 
      label: 'WPA/WPA2', 
      icon: Shield, 
      color: 'from-emerald-500 to-teal-600',
      description: 'Most secure and recommended'
    },
    { 
      value: 'WPA3', 
      label: 'WPA3', 
      icon: Lock, 
      color: 'from-blue-500 to-indigo-600',
      description: 'Latest security standard'
    },
    { 
      value: 'WEP', 
      label: 'WEP', 
      icon: AlertTriangle, 
      color: 'from-yellow-500 to-orange-600',
      description: 'Deprecated and insecure'
    },
    { 
      value: 'nopass', 
      label: 'Open Network', 
      icon: Globe, 
      color: 'from-stone-400 to-stone-600',
      description: 'No password required'
    }
  ], []);

  const encryptionOptions = useMemo(() => [
    { value: 'auto', label: 'Auto' },
    { value: 'TKIP', label: 'TKIP' },
    { value: 'CCMP', label: 'CCMP (AES)' }
  ], []);

  const bandOptions = useMemo(() => [
    { value: 'dual', label: '2.4GHz + 5GHz', icon: Radio },
    { value: '2.4GHz', label: '2.4GHz Only', icon: Radio },
    { value: '5GHz', label: '5GHz Only', icon: Radio }
  ], []);

  // ==================== RENDER ====================

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-rose-50/30 to-pink-50/30 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-rose-100 to-pink-100 text-rose-800 px-6 py-3 rounded-full text-sm font-medium mb-6 shadow-lg">
              <Wifi className="h-4 w-4" />
              <span>Advanced WiFi QR Generator</span>
              <Star className="h-4 w-4 text-rose-600" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-stone-900 mb-6">
              Share your WiFi
              <br />
              <span className="bg-gradient-to-r from-rose-700 via-pink-700 to-purple-700 bg-clip-text text-transparent">
                instantly and securely
              </span>
            </h1>
            
            <p className="text-xl text-stone-700 max-w-3xl mx-auto mb-8">
              Generate professional WiFi QR codes with advanced security options, 
              validation, and analytics for seamless guest connectivity.
            </p>

            {/* Stats Dashboard */}
            {stats.totalGenerated > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-stone-200">
                  <div className="flex items-center space-x-2">
                    <QrCode className="h-5 w-5 text-rose-600" />
                    <span className="text-2xl font-bold text-stone-900">{stats.totalGenerated}</span>
                  </div>
                  <p className="text-sm text-stone-600">QR Codes Generated</p>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-stone-200">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    <span className="text-2xl font-bold text-stone-900">{stats.averageTime.toFixed(0)}ms</span>
                  </div>
                  <p className="text-sm text-stone-600">Average Generation</p>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-stone-200">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className="text-2xl font-bold text-stone-900">{stats.mostUsedSecurity}</span>
                  </div>
                  <p className="text-sm text-stone-600">Preferred Security</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid xl:grid-cols-3 gap-8">
            {/* Enhanced WiFi Form */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-stone-200/50 p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-br from-rose-600 to-pink-700 rounded-2xl shadow-lg">
                      <Wifi className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-stone-900">WiFi Configuration</h2>
                      <p className="text-stone-600 text-sm">Configure your network details with advanced options</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handleReset}
                      className="p-3 text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-all"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className={`p-3 rounded-xl transition-all ${
                        showAdvanced 
                          ? 'bg-rose-100 text-rose-700' 
                          : 'text-stone-600 hover:text-stone-800 hover:bg-stone-100'
                      }`}
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Network Name */}
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-3">
                      Network Name (SSID) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={config.ssid}
                        onChange={(e) => setConfig({ ...config, ssid: e.target.value })}
                        placeholder="Enter WiFi network name"
                        className={`w-full px-4 py-4 border rounded-2xl focus:ring-2 focus:border-transparent transition-all bg-stone-50/50 ${
                          validation?.errors.some(e => e.includes('SSID')) 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-stone-200 focus:ring-rose-500'
                        }`}
                      />
                      {config.ssid && (
                        <button
                          onClick={() => handleCopyToClipboard(config.ssid, 'SSID')}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-stone-500 hover:text-stone-700 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-3">
                      Password {config.security !== 'nopass' && '*'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={config.password}
                        onChange={(e) => setConfig({ ...config, password: e.target.value })}
                        placeholder={config.security === 'nopass' ? 'No password required' : 'Enter WiFi password'}
                        disabled={config.security === 'nopass'}
                        className={`w-full px-4 py-4 pr-24 border rounded-2xl focus:ring-2 focus:border-transparent transition-all ${
                          config.security === 'nopass' 
                            ? 'bg-stone-100 text-stone-500' 
                            : 'bg-stone-50/50'
                        } ${
                          validation?.errors.some(e => e.includes('Password')) 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-stone-200 focus:ring-rose-500'
                        }`}
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex space-x-2">
                        {config.password && config.security !== 'nopass' && (
                          <button
                            onClick={() => handleCopyToClipboard(config.password, 'Password')}
                            className="text-stone-500 hover:text-stone-700 transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                        {config.security !== 'nopass' && (
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-stone-500 hover:text-stone-700 transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Security Type */}
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-4">
                      Security Type
                    </label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {securityOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setConfig({ ...config, security: option.value as any })}
                          className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                            config.security === option.value
                              ? 'border-rose-500 bg-rose-50 shadow-lg shadow-rose-100 scale-105'
                              : 'border-stone-200 hover:border-stone-300 bg-white hover:shadow-md'
                          }`}
                        >
                          <div className="text-center">
                            <option.icon className={`h-6 w-6 mx-auto mb-2 ${
                              config.security === option.value ? 'text-rose-600' : 'text-stone-600'
                            }`} />
                            <div className="text-xs font-medium text-stone-900">{option.label}</div>
                            <div className="text-xs text-stone-500 mt-1">{option.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Options */}
                  {showAdvanced && (
                    <div className="space-y-6 p-6 bg-stone-50/50 rounded-2xl border border-stone-200">
                      <h3 className="text-lg font-semibold text-stone-900 flex items-center space-x-2">
                        <Settings className="h-5 w-5" />
                        <span>Advanced Options</span>
                      </h3>

                      {/* Encryption */}
                      {config.security !== 'nopass' && (
                        <div>
                          <label className="block text-sm font-semibold text-stone-700 mb-3">
                            Encryption Method
                          </label>
                          <select
                            value={config.encryption}
                            onChange={(e) => setConfig({ ...config, encryption: e.target.value as any })}
                            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-white"
                          >
                            {encryptionOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Frequency Band */}
                      <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-3">
                          Frequency Band
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {bandOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setConfig({ ...config, band: option.value as any })}
                              className={`p-3 rounded-xl border transition-all ${
                                config.band === option.value
                                  ? 'border-rose-500 bg-rose-50 text-rose-700'
                                  : 'border-stone-200 hover:border-stone-300 bg-white'
                              }`}
                            >
                              <option.icon className="h-4 w-4 mx-auto mb-1" />
                              <div className="text-xs font-medium">{option.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-3">
                          Network Priority (1-5)
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={config.priority}
                          onChange={(e) => setConfig({ ...config, priority: parseInt(e.target.value) })}
                          className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-stone-500 mt-1">
                          <span>Low</span>
                          <span className="font-medium text-stone-700">{config.priority}</span>
                          <span>High</span>
                        </div>
                      </div>

                      {/* QR Code Options */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-stone-700 mb-2">
                            QR Size (px)
                          </label>
                          <select
                            value={qrOptions.width}
                            onChange={(e) => setQrOptions({ ...qrOptions, width: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-white"
                          >
                            <option value={300}>300px</option>
                            <option value={400}>400px</option>
                            <option value={500}>500px</option>
                            <option value={600}>600px</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-stone-700 mb-2">
                            Error Correction
                          </label>
                          <select
                            value={qrOptions.errorCorrectionLevel}
                            onChange={(e) => setQrOptions({ ...qrOptions, errorCorrectionLevel: e.target.value as any })}
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-white"
                          >
                            <option value="L">Low (7%)</option>
                            <option value="M">Medium (15%)</option>
                            <option value="Q">Quartile (25%)</option>
                            <option value="H">High (30%)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      <input
                        type="checkbox"
                        id="hidden"
                        checked={config.hidden}
                        onChange={(e) => setConfig({ ...config, hidden: e.target.checked })}
                        className="w-5 h-5 text-rose-600 bg-stone-100 border-stone-300 rounded focus:ring-rose-500 focus:ring-2"
                      />
                      <label htmlFor="hidden" className="text-sm font-medium text-stone-700 flex items-center space-x-2">
                        <span>Hidden Network</span>
                        <Info className="h-4 w-4 text-stone-500" title="Network won't appear in WiFi lists" />
                      </label>
                    </div>
                  </div>

                  {/* Validation Messages */}
                  {validation && (
                    <div className="space-y-3">
                      {validation.errors.length > 0 && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                          <div className="flex items-center space-x-2 text-red-800 mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">Validation Errors</span>
                          </div>
                          <ul className="text-sm text-red-700 space-y-1">
                            {validation.errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {validation.suggestions.length > 0 && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                          <div className="flex items-center space-x-2 text-blue-800 mb-2">
                            <Info className="h-4 w-4" />
                            <span className="font-medium">Suggestions</span>
                          </div>
                          <ul className="text-sm text-blue-700 space-y-1">
                            {validation.suggestions.map((suggestion, index) => (
                              <li key={index}>• {suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-stone-700">Data Usage:</span>
                          <span className={`font-medium ${
                            validation.capacityUsage > 80 ? 'text-red-600' : 
                            validation.capacityUsage > 60 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {validation.capacityUsage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-2 w-full bg-stone-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              validation.capacityUsage > 80 ? 'bg-red-500' : 
                              validation.capacityUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(validation.capacityUsage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={!config.ssid.trim() || loading || (validation && !validation.isValid)}
                    className="w-full bg-gradient-to-r from-rose-600 to-pink-700 text-white font-semibold py-4 px-6 rounded-2xl hover:from-rose-700 hover:to-pink-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] shadow-lg shadow-rose-200 disabled:shadow-none"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Generating QR Code...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <Zap className="h-5 w-5" />
                        <span>Generate WiFi QR Code</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Generation History */}
              {generationHistory.length > 0 && (
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-stone-200/50 p-6">
                  <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Recent Generations</span>
                  </h3>
                  <div className="space-y-3">
                    {generationHistory.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                        <div>
                          <div className="font-medium text-stone-900">{item.ssid}</div>
                          <div className="text-sm text-stone-600">
                            {item.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-stone-700">
                          {item.duration.toFixed(0)}ms
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced QR Code Display */}
            <div className="xl:col-span-1">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-stone-200/50 p-8 sticky top-6">
                {qrCodeUrl ? (
                  <div className="text-center space-y-6">
                    <div className="inline-block p-6 bg-gradient-to-br from-stone-50 to-rose-50/50 rounded-3xl shadow-inner border border-stone-100">
                      <img
                        src={qrCodeUrl}
                        alt="WiFi QR Code"
                        className="w-64 h-64 mx-auto rounded-2xl shadow-lg"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      {/* Network Details Card */}
                      <div className="p-6 bg-gradient-to-br from-rose-50 to-pink-50/50 rounded-2xl border border-rose-100">
                        <h3 className="font-semibold text-rose-900 mb-4 flex items-center space-x-2">
                          <Wifi className="h-4 w-4" />
                          <span>Network Details</span>
                        </h3>
                        <div className="text-sm space-y-2 text-rose-800">
                          <div className="flex justify-between">
                            <strong>SSID:</strong> 
                            <span className="font-mono bg-white px-2 py-1 rounded">{config.ssid}</span>
                          </div>
                          <div className="flex justify-between">
                            <strong>Security:</strong> 
                            <span className="font-mono bg-white px-2 py-1 rounded">{config.security}</span>
                          </div>
                          {config.password && (
                            <div className="flex justify-between">
                              <strong>Password:</strong> 
                              <span className="font-mono bg-white px-2 py-1 rounded">
                                {showPassword ? config.password : '••••••••'}
                              </span>
                            </div>
                          )}
                          {config.hidden && (
                            <div className="flex justify-between">
                              <strong>Hidden:</strong>
                              <span className="text-rose-600 font-medium">🔒 Yes</span>
                            </div>
                          )}
                          {showAdvanced && (
                            <>
                              <div className="flex justify-between">
                                <strong>Band:</strong> 
                                <span className="font-mono bg-white px-2 py-1 rounded">{config.band}</span>
                              </div>
                              <div className="flex justify-between">
                                <strong>Priority:</strong> 
                                <span className="font-mono bg-white px-2 py-1 rounded">{config.priority}/5</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Title Input */}
                      <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-2">
                          Title for Storage
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Enter a descriptive title..."
                          className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-stone-50/50"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-3">
                        <div className="flex space-x-3">
                          <button
                            onClick={handleDownload}
                            className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-3 rounded-2xl hover:from-emerald-700 hover:to-teal-800 transition-all duration-200 shadow-lg shadow-emerald-200 transform hover:scale-105"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                          
                          <button
                            onClick={handleSave}
                            disabled={!title.trim()}
                            className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-rose-600 to-pink-700 text-white px-4 py-3 rounded-2xl hover:from-rose-700 hover:to-pink-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-rose-200 transform hover:scale-105 disabled:transform-none"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save</span>
                          </button>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleCopyToClipboard(qrCodeUrl, 'QR Code URL')}
                            className="flex-1 flex items-center justify-center space-x-2 bg-stone-100 text-stone-700 px-3 py-2 rounded-xl hover:bg-stone-200 transition-all duration-200"
                          >
                            <Copy className="h-4 w-4" />
                            <span className="text-sm">Copy URL</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              setQrCodeUrl('');
                              addToast({ type: 'info', message: 'QR code cleared' });
                            }}
                            className="flex-1 flex items-center justify-center space-x-2 bg-stone-100 text-stone-700 px-3 py-2 rounded-xl hover:bg-stone-200 transition-all duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-sm">Clear</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-rose-100 to-pink-100 rounded-3xl flex items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-rose-300 to-pink-300 rounded-2xl flex items-center justify-center">
                        <Wifi className="h-8 w-8 text-rose-700" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-stone-900 mb-2">
                      Your WiFi QR Code will appear here
                    </h3>
                    <p className="text-stone-600">
                      Configure network settings and click generate to create your QR code
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WiFiQRGenerator;
