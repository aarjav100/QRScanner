import React, { useState } from 'react';
import { X, User, Bell, Palette, Download, Shield, HelpCircle, Trash2, Save } from 'lucide-react';
import { User as UserType, UserPreferences } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  onUpdateUser: (updates: Partial<UserType>) => void;
  onClearData: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  onUpdateUser,
  onClearData 
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [preferences, setPreferences] = useState<UserPreferences>(
    user?.preferences || {
      theme: 'light',
      defaultQRSize: 300,
      autoSave: true,
      showTutorial: true,
      notifications: true,
      exportFormat: 'png'
    }
  );

  if (!isOpen || !user) return null;

  const handleSavePreferences = () => {
    onUpdateUser({ preferences });
    onClose();
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data & Privacy', icon: Shield }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-8 border-b border-stone-200">
          <h2 className="text-2xl font-bold text-stone-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-stone-50 p-6">
            <nav className="space-y-2">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl font-medium transition-all ${
                    activeTab === id
                      ? 'bg-amber-100 text-amber-800 shadow-sm'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-stone-900 mb-6">Profile Information</h3>
                
                <div className="flex items-center space-x-6 mb-8">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100 relative group">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-10 w-10 text-amber-600" />
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity" style={{transition: 'opacity 0.2s'}}>
                      <span className="text-white text-xs font-semibold bg-amber-600 px-3 py-1 rounded-full">Change</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            onUpdateUser({ avatar: url }); // For now, just preview
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-stone-900">{user.name}</h4>
                    <p className="text-stone-600">{user.email}</p>
                    <p className="text-sm text-stone-500">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={user.name}
                      onChange={(e) => onUpdateUser({ name: e.target.value })}
                      className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-stone-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={user.email}
                      onChange={(e) => onUpdateUser({ email: e.target.value })}
                      className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-stone-50/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-stone-900 mb-6">App Preferences</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-3">Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['light', 'dark', 'auto'].map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setPreferences({ ...preferences, theme: theme as any })}
                          className={`p-4 rounded-2xl border-2 transition-all ${
                            preferences.theme === theme
                              ? 'border-amber-500 bg-amber-50'
                              : 'border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-sm font-medium text-stone-900 capitalize">{theme}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-3">
                      Default QR Code Size: {preferences.defaultQRSize}px
                    </label>
                    <input
                      type="range"
                      min="200"
                      max="500"
                      step="50"
                      value={preferences.defaultQRSize}
                      onChange={(e) => setPreferences({ ...preferences, defaultQRSize: parseInt(e.target.value) })}
                      className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-3">Export Format</label>
                    <select
                      value={preferences.exportFormat}
                      onChange={(e) => setPreferences({ ...preferences, exportFormat: e.target.value as any })}
                      className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-stone-50/50"
                    >
                      <option value="png">PNG</option>
                      <option value="svg">SVG</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                      <div>
                        <div className="font-medium text-stone-900">Auto Save</div>
                        <div className="text-sm text-stone-600">Automatically save generated QR codes</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.autoSave}
                          onChange={(e) => setPreferences({ ...preferences, autoSave: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                      <div>
                        <div className="font-medium text-stone-900">Show Tutorial</div>
                        <div className="text-sm text-stone-600">Display helpful tips and tutorials</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.showTutorial}
                          onChange={(e) => setPreferences({ ...preferences, showTutorial: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-stone-900 mb-6">Notification Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                    <div>
                      <div className="font-medium text-stone-900">Push Notifications</div>
                      <div className="text-sm text-stone-600">Receive notifications about app updates</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.notifications}
                        onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-stone-900 mb-6">Data & Privacy</h3>
                
                <div className="space-y-6">
                  <div className="p-6 bg-red-50 rounded-2xl border border-red-200">
                    <h4 className="font-semibold text-red-900 mb-2">Danger Zone</h4>
                    <p className="text-red-700 text-sm mb-4">
                      This action will permanently delete all your QR codes and cannot be undone.
                    </p>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
                          onClearData();
                          onClose();
                        }
                      }}
                      className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Clear All Data</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-4 p-8 border-t border-stone-200">
          <button
            onClick={onClose}
            className="px-6 py-3 text-stone-600 hover:text-stone-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSavePreferences}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-orange-700 text-white px-6 py-3 rounded-2xl hover:from-amber-700 hover:to-orange-800 transition-all shadow-lg shadow-amber-200"
          >
            <Save className="h-4 w-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;