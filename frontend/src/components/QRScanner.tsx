import React, { useState, useCallback } from 'react';
import { Upload, Scan, FileImage, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { scanQRCodeFromImage, detectQRType, parseWiFiQR } from '../utils/qrScanner';
import { QRCodeData } from '../types';

interface QRScannerProps {
  onSave: (qrData: QRCodeData) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onSave }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedContent, setScannedContent] = useState<string>('');
  const [scannedType, setScannedType] = useState<string>('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string>('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError('');

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (!imageFile) {
      setError('Please drop an image file');
      return;
    }

    await processImage(imageFile);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImage(file);
    }
  };

  const processImage = async (file: File) => {
    setScanning(true);
    setError('');
    setScannedContent('');

    try {
      const content = await scanQRCodeFromImage(file);
      if (content) {
        setScannedContent(content);
        const type = detectQRType(content);
        setScannedType(type);
        
        // Auto-generate title based on content
        let autoTitle = '';
        if (type === 'wifi') {
          const wifiData = parseWiFiQR(content);
          autoTitle = wifiData ? `WiFi: ${wifiData.ssid}` : 'WiFi Network';
        } else if (type === 'url') {
          try {
            const url = new URL(content);
            autoTitle = url.hostname;
          } catch {
            autoTitle = 'Website Link';
          }
        } else if (type === 'email') {
          autoTitle = content.replace('mailto:', '');
        } else if (type === 'phone') {
          autoTitle = content.replace('tel:', '');
        } else {
          autoTitle = content.length > 30 ? content.substring(0, 30) + '...' : content;
        }
        
        setTitle(autoTitle);
      } else {
        setError('No QR code found in the image');
      }
    } catch (err) {
      setError('Failed to scan QR code from image');
    } finally {
      setScanning(false);
    }
  };

  const handleSave = () => {
    if (!scannedContent || !title.trim()) return;

    const qrData: QRCodeData = {
      id: Date.now().toString(),
      type: scannedType as any,
      title: title.trim(),
      content: scannedContent,
      createdAt: new Date().toISOString(),
      qrCodeUrl: '', // Will be generated when needed
      isScanned: true,
      scannedFrom: 'image'
    };

    onSave(qrData);
    setTitle('');
    setScannedContent('');
    setScannedType('');
    setError('');
  };

  const formatContent = (content: string, type: string) => {
    if (type === 'wifi') {
      const wifiData = parseWiFiQR(content);
      if (wifiData) {
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-stone-700">Network:</span>
              <span className="text-stone-900">{wifiData.ssid}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-stone-700">Security:</span>
              <span className="text-stone-900">{wifiData.security}</span>
            </div>
            {wifiData.password && (
              <div className="flex justify-between">
                <span className="font-medium text-stone-700">Password:</span>
                <span className="text-stone-900 font-mono">{wifiData.password}</span>
              </div>
            )}
            {wifiData.hidden && (
              <div className="text-amber-700 text-xs">🔒 Hidden Network</div>
            )}
          </div>
        );
      }
    }
    return <div className="text-sm break-all text-stone-900">{content}</div>;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      wifi: 'bg-rose-100 text-rose-800 border-rose-200',
      url: 'bg-amber-100 text-amber-800 border-amber-200',
      email: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      phone: 'bg-orange-100 text-orange-800 border-orange-200',
      text: 'bg-stone-100 text-stone-800 border-stone-200'
    };
    return colors[type as keyof typeof colors] || colors.text;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-emerald-50/30 to-teal-50/30 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Camera className="h-4 w-4" />
            <span>QR Code Scanner</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4">
            Scan and decode
            <br />
            <span className="bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
              any QR code instantly
            </span>
          </h1>
          <p className="text-lg text-stone-700 max-w-2xl mx-auto">
            Upload or drag & drop QR code images to extract their content 
            and save them to your collection.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Scanner Area */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-stone-200/50 p-8">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl shadow-lg">
                <Scan className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-stone-900">Upload QR Code</h2>
                <p className="text-stone-600 text-sm">Drag & drop or click to select</p>
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-50 scale-105'
                  : 'border-stone-300 hover:border-emerald-400 hover:bg-stone-50'
              }`}
            >
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className={`p-6 rounded-3xl transition-all duration-300 ${
                    isDragging ? 'bg-emerald-100 scale-110' : 'bg-stone-100'
                  }`}>
                    <FileImage className={`h-16 w-16 ${
                      isDragging ? 'text-emerald-600' : 'text-stone-400'
                    }`} />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-stone-900 mb-3">
                    Drop QR Code Image Here
                  </h3>
                  <p className="text-stone-600 mb-6">
                    Supports JPG, PNG, GIF and other image formats
                  </p>
                  
                  <label className="inline-flex items-center space-x-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-8 py-4 rounded-2xl hover:from-emerald-700 hover:to-teal-800 cursor-pointer transition-all duration-200 transform hover:scale-105 shadow-lg shadow-emerald-200">
                    <Upload className="h-5 w-5" />
                    <span className="font-medium">Select Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {scanning && (
              <div className="mt-6 p-6 bg-amber-50 rounded-2xl border border-amber-200">
                <div className="flex items-center space-x-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                  <div>
                    <div className="font-medium text-amber-900">Scanning QR code...</div>
                    <div className="text-sm text-amber-700">Processing your image</div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 p-6 bg-red-50 rounded-2xl border border-red-200">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <div className="font-medium text-red-900">Scan Failed</div>
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Area */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-stone-200/50 p-8">
            {scannedContent ? (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">QR Code Decoded</h3>
                    <p className="text-stone-600 text-sm">Content extracted successfully</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      Type
                    </label>
                    <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${getTypeColor(scannedType)}`}>
                      {scannedType.charAt(0).toUpperCase() + scannedType.slice(1)}
                      {scannedType === 'wifi' && ' 📶'}
                      {scannedType === 'url' && ' 🌐'}
                      {scannedType === 'email' && ' 📧'}
                      {scannedType === 'phone' && ' 📱'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-3">
                      Content
                    </label>
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      {formatContent(scannedContent, scannedType)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-3">
                      Title for Storage
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a descriptive title..."
                      className="w-full px-4 py-4 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-stone-50/50"
                    />
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={!title.trim()}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold py-4 px-6 rounded-2xl hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] shadow-lg shadow-emerald-200"
                  >
                    Save Scanned QR Code
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-stone-100 to-emerald-100 rounded-3xl flex items-center justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-stone-300 to-emerald-300 rounded-2xl flex items-center justify-center">
                    <Scan className="h-8 w-8 text-stone-700" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">
                  Scan results will appear here
                </h3>
                <p className="text-stone-600">
                  Upload a QR code image to see its content
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;