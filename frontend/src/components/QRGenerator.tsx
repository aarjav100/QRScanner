import React, { useState } from 'react';
import { Plus, Download, Save, Sparkles, Zap } from 'lucide-react';
import { generateQRCode, downloadQRCode } from '../utils/qrGenerator';
import { QRCodeData } from '../types';

interface QRGeneratorProps {
  onSave: (qrData: QRCodeData) => void;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({ onSave }) => {
  const [type, setType] = useState<'text' | 'url' | 'email' | 'phone'>('text');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!content.trim()) return;
    
    setLoading(true);
    try {
      const qrUrl = await generateQRCode(content);
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!qrCodeUrl || !title.trim()) return;

    const qrData: QRCodeData = {
      id: Date.now().toString(),
      type,
      title: title.trim(),
      content,
      createdAt: new Date().toISOString(),
      qrCodeUrl
    };

    onSave(qrData);
    setTitle('');
    setContent('');
    setQrCodeUrl('');
  };

  const handleDownload = () => {
    if (qrCodeUrl) {
      downloadQRCode(qrCodeUrl, title || 'qr-code');
    }
  };

  const typeOptions = [
    { value: 'text', label: 'Plain Text', icon: '📝', color: 'from-stone-400 to-stone-600' },
    { value: 'url', label: 'Website URL', icon: '🌐', color: 'from-amber-500 to-orange-600' },
    { value: 'email', label: 'Email Address', icon: '📧', color: 'from-emerald-500 to-teal-600' },
    { value: 'phone', label: 'Phone Number', icon: '📱', color: 'from-rose-500 to-pink-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50/30 to-orange-50/30 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>Generate QR Codes</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4">
            Create your QR codes
            <br />
            <span className="bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
              and get more done
            </span>
          </h1>
          <p className="text-lg text-stone-700 max-w-2xl mx-auto">
            With QRScope, generate beautiful QR codes for any content in a warm, 
            flexible, and rewarding way.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Generator Form */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-stone-200/50 p-8">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-gradient-to-br from-amber-600 to-orange-700 rounded-2xl shadow-lg">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-stone-900">QR Generator</h2>
                <p className="text-stone-600 text-sm">Create custom QR codes instantly</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-4">
                  Choose QR Code Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {typeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setType(option.value as any)}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                        type === option.value
                          ? 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-100'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">{option.icon}</div>
                        <div className="text-sm font-medium text-stone-900">{option.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-3">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Enter ${type === 'url' ? 'URL (e.g., https://example.com)' : 
                              type === 'email' ? 'email address' : 
                              type === 'phone' ? 'phone number' : 'text content'}...`}
                  rows={4}
                  className="w-full px-4 py-4 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none bg-stone-50/50 backdrop-blur-sm"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={!content.trim() || loading}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-700 text-white font-semibold py-4 px-6 rounded-2xl hover:from-amber-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] shadow-lg shadow-amber-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Generate QR Code</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* QR Code Display */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-stone-200/50 p-8">
            {qrCodeUrl ? (
              <div className="text-center space-y-6">
                <div className="inline-block p-6 bg-gradient-to-br from-stone-50 to-amber-50/50 rounded-3xl shadow-inner border border-stone-100">
                  <img
                    src={qrCodeUrl}
                    alt="Generated QR Code"
                    className="w-64 h-64 mx-auto rounded-2xl shadow-lg"
                  />
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      Title for Storage
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a descriptive title..."
                      className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-stone-50/50"
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
                      className="flex-1 flex items-center justify-center space-x-2 bg-amber-600 text-white px-4 py-3 rounded-2xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-amber-200"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-stone-100 to-amber-100 rounded-3xl flex items-center justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-stone-300 to-amber-300 rounded-2xl flex items-center justify-center">
                    <Plus className="h-8 w-8 text-stone-700" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">
                  Your QR Code will appear here
                </h3>
                <p className="text-stone-600">
                  Enter content and click generate to create your QR code
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;