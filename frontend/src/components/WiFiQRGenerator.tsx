import React, { useState } from 'react';
import { Wifi, Eye, EyeOff, Download, Save, Shield, Zap } from 'lucide-react';
import { generateWiFiQRCode, downloadQRCode } from '../utils/qrGenerator';
import { QRCodeData, WiFiConfig } from '../types';

interface WiFiQRGeneratorProps {
  onSave: (qrData: QRCodeData) => void;
}

const WiFiQRGenerator: React.FC<WiFiQRGeneratorProps> = ({ onSave }) => {
  const [config, setConfig] = useState<WiFiConfig>({
    ssid: '',
    password: '',
    security: 'WPA',
    hidden: false
  });
  const [title, setTitle] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleGenerate = async () => {
    if (!config.ssid.trim()) return;
    
    setLoading(true);
    try {
      const qrUrl = await generateWiFiQRCode(config);
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Error generating WiFi QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!qrCodeUrl || !title.trim()) return;

    const qrData: QRCodeData = {
      id: Date.now().toString(),
      type: 'wifi',
      title: title.trim(),
      content: `WIFI:T:${config.security};S:${config.ssid};P:${config.password};H:${config.hidden};;`,
      createdAt: new Date().toISOString(),
      qrCodeUrl
    };

    onSave(qrData);
    setTitle('');
    setConfig({
      ssid: '',
      password: '',
      security: 'WPA',
      hidden: false
    });
    setQrCodeUrl('');
  };

  const handleDownload = () => {
    if (qrCodeUrl) {
      downloadQRCode(qrCodeUrl, title || 'wifi-qr');
    }
  };

  const securityOptions = [
    { value: 'WPA', label: 'WPA/WPA2', icon: Shield, color: 'from-emerald-500 to-teal-600' },
    { value: 'WEP', label: 'WEP', icon: Shield, color: 'from-yellow-500 to-orange-600' },
    { value: 'nopass', label: 'No Password', icon: Wifi, color: 'from-stone-400 to-stone-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-rose-50/30 to-pink-50/30 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-rose-100 text-rose-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Wifi className="h-4 w-4" />
            <span>WiFi QR Generator</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4">
            Share your WiFi
            <br />
            <span className="bg-gradient-to-r from-rose-700 to-pink-700 bg-clip-text text-transparent">
              instantly and securely
            </span>
          </h1>
          <p className="text-lg text-stone-700 max-w-2xl mx-auto">
            Generate WiFi QR codes that allow guests to connect to your network 
            without typing passwords.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* WiFi Form */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-stone-200/50 p-8">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-gradient-to-br from-rose-600 to-pink-700 rounded-2xl shadow-lg">
                <Wifi className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-stone-900">WiFi Settings</h2>
                <p className="text-stone-600 text-sm">Configure your network details</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-3">
                  Network Name (SSID) *
                </label>
                <input
                  type="text"
                  value={config.ssid}
                  onChange={(e) => setConfig({ ...config, ssid: e.target.value })}
                  placeholder="Enter WiFi network name"
                  className="w-full px-4 py-4 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-stone-50/50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-3">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={config.password}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    placeholder="Enter WiFi password"
                    className="w-full px-4 py-4 pr-12 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-stone-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-stone-500 hover:text-stone-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-4">
                  Security Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {securityOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setConfig({ ...config, security: option.value as any })}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                        config.security === option.value
                          ? 'border-rose-500 bg-rose-50 shadow-lg shadow-rose-100'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="text-center">
                        <option.icon className="h-6 w-6 mx-auto mb-2 text-stone-600" />
                        <div className="text-xs font-medium text-stone-900">{option.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-stone-50 rounded-2xl">
                <input
                  type="checkbox"
                  id="hidden"
                  checked={config.hidden}
                  onChange={(e) => setConfig({ ...config, hidden: e.target.checked })}
                  className="w-5 h-5 text-rose-600 bg-stone-100 border-stone-300 rounded focus:ring-rose-500 focus:ring-2"
                />
                <label htmlFor="hidden" className="text-sm font-medium text-stone-700">
                  Hidden Network
                </label>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!config.ssid.trim() || loading}
                className="w-full bg-gradient-to-r from-rose-600 to-pink-700 text-white font-semibold py-4 px-6 rounded-2xl hover:from-rose-700 hover:to-pink-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] shadow-lg shadow-rose-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Generating...</span>
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

          {/* QR Code Display */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-stone-200/50 p-8">
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
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <h3 className="font-semibold text-rose-900 mb-2">Network Details</h3>
                    <div className="text-sm space-y-1 text-rose-800">
                      <div><strong>SSID:</strong> {config.ssid}</div>
                      <div><strong>Security:</strong> {config.security}</div>
                      {config.password && <div><strong>Password:</strong> {config.password}</div>}
                      {config.hidden && <div className="text-rose-600">🔒 Hidden Network</div>}
                    </div>
                  </div>

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

                  <div className="flex space-x-3">
                    <button
                      onClick={handleDownload}
                      className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl hover:bg-emerald-700 transition-all duration-200 shadow-lg shadow-emerald-200"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!title.trim()}
                      className="flex-1 flex items-center justify-center space-x-2 bg-rose-600 text-white px-4 py-3 rounded-2xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-rose-200"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </button>
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
                  Enter network details and click generate
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WiFiQRGenerator;