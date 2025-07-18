import React, { useState } from 'react';
import { Archive, Download, Trash2, Search, Filter, Calendar, Eye, QrCode as QrCodeIcon, Grid, List, Folder } from 'lucide-react';
import { QRCodeData } from '../types';
import { downloadQRCode, generateQRCode } from '../utils/qrGenerator';

interface QRStorageProps {
  qrCodes: QRCodeData[];
  loading?: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updatedData: Partial<QRCodeData>) => void;
}

const QRStorage: React.FC<QRStorageProps> = ({ qrCodes, loading = false, onDelete, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedQR, setSelectedQR] = useState<QRCodeData | null>(null);

  const filteredQRCodes = qrCodes.filter(qr => {
    const matchesSearch = qr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         qr.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || qr.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeColor = (type: string) => {
    const colors = {
      text: 'bg-stone-100 text-stone-800 border-stone-200',
      url: 'bg-amber-100 text-amber-800 border-amber-200',
      wifi: 'bg-rose-100 text-rose-800 border-rose-200',
      email: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      phone: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[type as keyof typeof colors] || 'bg-stone-100 text-stone-800 border-stone-200';
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      text: '📝',
      url: '🌐',
      wifi: '📶',
      email: '📧',
      phone: '📱'
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  const handleGenerateQRCode = async (qr: QRCodeData) => {
    if (!qr.qrCodeUrl) {
      try {
        const qrCodeUrl = await generateQRCode(qr.content);
        onUpdate(qr.id, { qrCodeUrl });
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }
  };

  const handleViewDetails = (qr: QRCodeData) => {
    setSelectedQR(qr);
  };

  const typeStats = qrCodes.reduce((acc, qr) => {
    acc[qr.type] = (acc[qr.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50/30 to-orange-50/30 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Folder className="h-4 w-4" />
            <span>QR Code Storage</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4">
            Manage your collection
            <br />
            <span className="bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
              and stay organized
            </span>
          </h1>
          <p className="text-lg text-stone-700 max-w-2xl mx-auto">
            All your QR codes in one place. Search, filter, and manage your 
            collection with ease.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 border border-stone-200/50 shadow-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-stone-900">{qrCodes.length}</div>
              <div className="text-sm text-stone-600">Total QR Codes</div>
            </div>
          </div>
          {Object.entries(typeStats).map(([type, count]) => (
            <div key={type} className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 border border-stone-200/50 shadow-lg">
              <div className="text-center">
                <div className="text-xl mb-1">{getTypeIcon(type)}</div>
                <div className="text-lg font-semibold text-stone-900">{count}</div>
                <div className="text-xs text-stone-600 capitalize">{type}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-stone-200/50 p-8 mb-8">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            <div className="flex-1 w-full lg:max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search QR codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-stone-50/50"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-10 pr-8 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-stone-50/50"
                >
                  <option value="all">All Types</option>
                  <option value="text">Text</option>
                  <option value="url">URL</option>
                  <option value="wifi">WiFi</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </div>
              
              <div className="flex bg-stone-100 rounded-2xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-xl transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-white text-amber-700 shadow-sm' 
                      : 'text-stone-600 hover:text-amber-700'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-xl transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white text-amber-700 shadow-sm' 
                      : 'text-stone-600 hover:text-amber-700'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* QR Codes Grid/List */}
        {loading ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-stone-200/50 p-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-6"></div>
              <h3 className="text-2xl font-semibold text-stone-900 mb-3">Loading QR codes...</h3>
              <p className="text-stone-600 text-lg">Please wait while we fetch your collection</p>
            </div>
          </div>
        ) : filteredQRCodes.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-stone-200/50 p-16">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-stone-100 to-amber-100 rounded-3xl flex items-center justify-center">
                <Archive className="h-16 w-16 text-stone-400" />
              </div>
              <h3 className="text-2xl font-semibold text-stone-900 mb-3">
                {qrCodes.length === 0 ? 'No QR codes yet' : 'No matches found'}
              </h3>
              <p className="text-stone-600 text-lg">
                {qrCodes.length === 0 
                  ? 'Start by generating or scanning your first QR code' 
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className={`${
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
              : 'space-y-4'
          }`}>
            {filteredQRCodes.map((qr) => (
              <div 
                key={qr.id} 
                className={`bg-white/90 backdrop-blur-xl rounded-3xl shadow-lg border border-stone-200/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] ${
                  viewMode === 'grid' ? 'p-6' : 'p-6 flex items-center space-x-6'
                }`}
              >
                {viewMode === 'list' && (
                  <div className="flex-shrink-0">
                    {qr.qrCodeUrl ? (
                      <img
                        src={qr.qrCodeUrl}
                        alt={qr.title}
                        className="w-20 h-20 border-2 border-stone-200 rounded-2xl shadow-sm"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-stone-100 to-amber-100 border-2 border-stone-200 rounded-2xl flex items-center justify-center">
                        <QrCodeIcon className="h-10 w-10 text-stone-400" />
                      </div>
                    )}
                  </div>
                )}
                
                <div className={viewMode === 'grid' ? '' : 'flex-1 min-w-0'}>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(qr.type)}`}>
                      {getTypeIcon(qr.type)} {qr.type.charAt(0).toUpperCase() + qr.type.slice(1)}
                      {qr.isScanned && <span className="ml-1">📷</span>}
                    </span>
                    <div className="flex items-center text-xs text-stone-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(qr.createdAt)}
                    </div>
                  </div>

                  {viewMode === 'grid' && (
                    <div className="flex justify-center mb-6">
                      {qr.qrCodeUrl ? (
                        <img
                          src={qr.qrCodeUrl}
                          alt={qr.title}
                          className="w-32 h-32 border-2 border-stone-200 rounded-2xl shadow-sm"
                        />
                      ) : (
                        <div className="w-32 h-32 bg-gradient-to-br from-stone-100 to-amber-100 border-2 border-stone-200 rounded-2xl flex items-center justify-center">
                          <QrCodeIcon className="h-16 w-16 text-stone-400" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    <h3 className="font-semibold text-stone-900 truncate text-lg">{qr.title}</h3>
                    <p className="text-sm text-stone-600 truncate">{qr.content}</p>
                  </div>
                </div>

                <div className={`flex space-x-2 ${viewMode === 'grid' ? '' : 'flex-shrink-0'}`}>
                  <button
                    onClick={() => handleViewDetails(qr)}
                    className="p-3 bg-amber-600 text-white rounded-2xl hover:bg-amber-700 transition-colors shadow-lg shadow-amber-200"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {!qr.qrCodeUrl && (
                    <button
                      onClick={() => handleGenerateQRCode(qr)}
                      className="p-3 bg-stone-600 text-white rounded-2xl hover:bg-stone-700 transition-colors shadow-lg shadow-stone-200"
                    >
                      <QrCodeIcon className="h-4 w-4" />
                    </button>
                  )}
                  {qr.qrCodeUrl && (
                    <button
                      onClick={() => downloadQRCode(qr.qrCodeUrl, qr.title)}
                      className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(qr.id)}
                    className="p-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {selectedQR && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-stone-900">QR Code Details</h3>
                <button
                  onClick={() => setSelectedQR(null)}
                  className="p-2 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="flex justify-center">
                  {selectedQR.qrCodeUrl ? (
                    <img
                      src={selectedQR.qrCodeUrl}
                      alt={selectedQR.title}
                      className="w-48 h-48 border-2 border-stone-200 rounded-2xl shadow-lg"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-gradient-to-br from-stone-100 to-amber-100 border-2 border-stone-200 rounded-2xl flex items-center justify-center">
                      <QrCodeIcon className="h-24 w-24 text-stone-400" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Title</label>
                    <p className="text-stone-900 text-lg">{selectedQR.title}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Type</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(selectedQR.type)}`}>
                      {getTypeIcon(selectedQR.type)} {selectedQR.type.charAt(0).toUpperCase() + selectedQR.type.slice(1)}
                      {selectedQR.isScanned && <span className="ml-1">📷</span>}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Content</label>
                    <p className="text-stone-900 break-all text-sm bg-stone-50 p-4 rounded-2xl border border-stone-200">{selectedQR.content}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Created</label>
                    <p className="text-stone-600">{formatDate(selectedQR.createdAt)}</p>
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  {!selectedQR.qrCodeUrl && (
                    <button
                      onClick={() => {
                        handleGenerateQRCode(selectedQR);
                        setSelectedQR(null);
                      }}
                      className="flex-1 bg-stone-600 text-white py-3 px-4 rounded-2xl hover:bg-stone-700 transition-colors font-medium shadow-lg shadow-stone-200"
                    >
                      Generate QR Code
                    </button>
                  )}
                  {selectedQR.qrCodeUrl && (
                    <button
                      onClick={() => downloadQRCode(selectedQR.qrCodeUrl, selectedQR.title)}
                      className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-2xl hover:bg-emerald-700 transition-colors font-medium shadow-lg shadow-emerald-200"
                    >
                      Download
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRStorage;