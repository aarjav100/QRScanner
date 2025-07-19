import React, { useState, createContext } from 'react';
import Navigation from './components/Navigation';
import QRGenerator from './components/QRGenerator';
import WiFiQRGenerator from './components/WiFiQRGenerator';
import QRScanner from './components/QRScanner';
import QRStorage from './components/QRStorage';
import SettingsModal from './components/SettingsModal';
import { QRCodeData } from './types';
import { useAuthProvider } from './hooks/useAuth';
import { useQRCodes } from './hooks/useQRCodes';

// Create Auth Context
export const AuthContext = createContext<any>(null);

function App() {
  const [activeTab, setActiveTab] = useState('generator');
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const auth = useAuthProvider();
  const { 
    qrCodes, 
    loading: qrLoading, 
    saveQRCode, 
    updateQRCode, 
    deleteQRCode, 
    clearAllQRCodes 
  } = useQRCodes(auth.user?.id || null);

  const handleSaveQRCode = async (qrData: Omit<QRCodeData, 'id' | 'createdAt'>) => {
    console.log('handleSaveQRCode called with:', qrData);
    console.log('Auth status:', { isAuthenticated: auth.isAuthenticated, userId: auth.user?.id });
    
    if (auth.isAuthenticated) {
      console.log('User is authenticated, saving QR code...');
      const result = await saveQRCode(qrData);
      console.log('Save result:', result);
    } else {
      console.log('User not authenticated, showing auth modal');
      // For non-authenticated users, show auth modal
      setShowAuthModal(true);
    }
  };

  const handleDeleteQRCode = async (id: string) => {
    await deleteQRCode(id);
  };

  const handleUpdateQRCode = async (id: string, updatedData: Partial<QRCodeData>) => {
    await updateQRCode(id, updatedData);
  };

  const handleClearAllData = async () => {
    await clearAllQRCodes();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'generator':
        return <QRGenerator onSave={handleSaveQRCode} />;
      case 'wifi':
        return <WiFiQRGenerator onSave={handleSaveQRCode} />;
      case 'scanner':
        return <QRScanner onSave={handleSaveQRCode} />;
      case 'storage':
        return (
          <QRStorage 
            qrCodes={qrCodes} 
            loading={qrLoading}
            onDelete={handleDeleteQRCode} 
            onUpdate={handleUpdateQRCode} 
          />
        );
      default:
        return <QRGenerator onSave={handleSaveQRCode} />;
    }
  };

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-stone-600">Loading QRScope...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      <div className="min-h-screen bg-stone-50">
        <Navigation 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          user={auth.user}
          isAuthenticated={auth.isAuthenticated}
          onLogin={auth.login}
          onRegister={auth.register}
          onLogout={auth.logout}
          onSettings={() => setShowSettings(true)}
          showAuthModal={showAuthModal}
          setShowAuthModal={setShowAuthModal}
        />
        
        <main>
          {renderContent()}
        </main>

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          user={auth.user}
          onUpdateUser={auth.updateUser}
          onClearData={handleClearAllData}
        />

        {/* Footer */}
        <footer className="bg-stone-100 border-t border-stone-200 py-12 px-6 mt-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="col-span-2">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-orange-700 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">QR</span>
                  </div>
                  <h3 className="text-xl font-bold text-stone-900">QRScope</h3>
                </div>
                <p className="text-stone-600 mb-4">
                  The most powerful QR code generator and manager. Create, scan, and organize 
                  all your QR codes in one beautiful application.
                </p>
                <div className="flex space-x-4">
                  <div className="w-8 h-8 bg-stone-200 rounded-lg flex items-center justify-center">
                    <span className="text-stone-600 text-sm">📱</span>
                  </div>
                  <div className="w-8 h-8 bg-stone-200 rounded-lg flex items-center justify-center">
                    <span className="text-stone-600 text-sm">💻</span>
                  </div>
                  <div className="w-8 h-8 bg-stone-200 rounded-lg flex items-center justify-center">
                    <span className="text-stone-600 text-sm">🌐</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-stone-900 mb-4">Features</h4>
                <ul className="space-y-2 text-stone-600">
                  <li>QR Code Generator</li>
                  <li>WiFi QR Codes</li>
                  <li>Image Scanner</li>
                  <li>Cloud Storage</li>
                  <li>Batch Export</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-stone-900 mb-4">Support</h4>
                <ul className="space-y-2 text-stone-600">
                  <li>Help Center</li>
                  <li>Contact Us</li>
                  <li>Privacy Policy</li>
                  <li>Terms of Service</li>
                  <li>API Documentation</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-stone-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-stone-600 text-sm">
                © 2024 QRScope. All rights reserved.
              </p>
              <p className="text-stone-500 text-sm mt-2 md:mt-0">
                Made with ❤️ for QR code enthusiasts
              </p>
            </div>
          </div>
        </footer>
      </div>
    </AuthContext.Provider>
  );
}

export default App;