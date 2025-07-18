import React from 'react';
import { QrCode, Wifi, Archive, Scan, Settings } from 'lucide-react';
import { User } from '../types';
import UserMenu from './UserMenu';
import AuthModal from './AuthModal';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: User | null;
  isAuthenticated: boolean;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onRegister: (name: string, email: string, password: string) => Promise<boolean>;
  onLogout: () => void;
  onSettings: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const Navigation: React.FC<NavigationProps> = ({ 
  activeTab, 
  onTabChange, 
  user,
  isAuthenticated,
  onLogin,
  onRegister,
  onLogout,
  onSettings,
  showAuthModal,
  setShowAuthModal
}) => {
  const tabs = [
    { id: 'generator', label: 'Generator', icon: QrCode },
    { id: 'wifi', label: 'WiFi QR', icon: Wifi },
    { id: 'scanner', label: 'Scanner', icon: Scan },
    { id: 'storage', label: 'Storage', icon: Archive }
  ];

  return (
    <>
      <nav className="bg-stone-50/95 backdrop-blur-xl border-b border-stone-200/50 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-orange-700 rounded-xl flex items-center justify-center shadow-lg">
                  <QrCode className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-stone-800 to-amber-800 bg-clip-text text-transparent">
                  QRScope
                </h1>
                <p className="text-xs text-stone-600 -mt-1">Build & Manage QR Codes</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="hidden md:flex items-center space-x-2 bg-stone-100/80 rounded-full p-1">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => onTabChange(id)}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-full font-medium transition-all duration-300 ${
                      activeTab === id
                        ? 'bg-white text-amber-700 shadow-md shadow-amber-100'
                        : 'text-stone-600 hover:text-amber-700 hover:bg-white/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
              
              <div className="flex items-center space-x-3">
                <button 
                  onClick={onSettings}
                  className="p-2.5 text-stone-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-all duration-200"
                >
                  <Settings className="h-5 w-5" />
                </button>
                
                {isAuthenticated && user ? (
                  <UserMenu 
                    user={user} 
                    onSettings={onSettings}
                    onLogout={onLogout}
                  />
                ) : (
                  <button 
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center space-x-2 bg-stone-800 text-white px-4 py-2.5 rounded-xl hover:bg-stone-700 transition-all duration-200 shadow-lg"
                  >
                    <span className="text-sm font-medium">Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Mobile Navigation */}
          <div className="md:hidden pb-4">
            <div className="flex space-x-1 bg-stone-100/80 rounded-2xl p-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={`flex-1 flex flex-col items-center space-y-1 py-3 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === id
                      ? 'bg-white text-amber-700 shadow-sm'
                      : 'text-stone-600 hover:text-amber-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={onLogin}
        onRegister={onRegister}
      />
    </>
  );
};

export default Navigation;