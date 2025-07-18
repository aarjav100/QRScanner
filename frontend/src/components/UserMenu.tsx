import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, Download, HelpCircle, Star } from 'lucide-react';
import { User as UserType } from '../types';

interface UserMenuProps {
  user: UserType;
  onSettings: () => void;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onSettings, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { icon: User, label: 'Profile', action: onSettings },
    { icon: Settings, label: 'Settings', action: onSettings },
    { icon: Download, label: 'Export Data', action: () => console.log('Export data') },
    { icon: HelpCircle, label: 'Help & Support', action: () => console.log('Help') },
    { icon: LogOut, label: 'Sign Out', action: onLogout, danger: true }
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 bg-stone-800 text-white px-4 py-2.5 rounded-xl hover:bg-stone-700 transition-all duration-200 shadow-lg"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="h-4 w-4 text-amber-600" />
            </div>
          )}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-xs text-stone-300">{user.email}</div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-stone-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-5 w-5 text-amber-600" />
                  </div>
                )}
              </div>
              <div>
                <div className="font-medium text-stone-900">{user.name}</div>
                <div className="text-sm text-stone-600">{user.email}</div>
              </div>
            </div>
          </div>

          <div className="py-2">
            {menuItems.map(({ icon: Icon, label, action, danger }) => (
              <button
                key={label}
                onClick={() => {
                  action();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors ${
                  danger ? 'text-red-600 hover:bg-red-50' : 'text-stone-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;