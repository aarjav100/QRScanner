export interface QRCodeData {
  id: string;
  type: 'text' | 'url' | 'wifi' | 'email' | 'phone';
  title: string;
  content: string;
  createdAt: string;
  qrCodeUrl: string;
  isScanned?: boolean;
  scannedFrom?: string;
  userId?: string;
  tags?: string[];
  category?: string;
  isFavorite?: boolean;
}

export interface WiFiConfig {
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  defaultQRSize: number;
  autoSave: boolean;
  showTutorial: boolean;
  notifications: boolean;
  exportFormat: 'png' | 'svg' | 'pdf';
}

export interface AppSettings {
  version: string;
  lastBackup: string;
  totalQRCodes: number;
  storageUsed: number;
}