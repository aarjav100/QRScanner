import QRCode from 'qrcode';
import { WiFiConfig } from '../types';

export const generateQRCode = async (content: string): Promise<string> => {
  try {
    const qrCodeUrl = await QRCode.toDataURL(content, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

export const generateWiFiQRCode = async (config: WiFiConfig): Promise<string> => {
  const wifiString = `WIFI:T:${config.security};S:${config.ssid};P:${config.password};H:${config.hidden};;`;
  return generateQRCode(wifiString);
};

export const downloadQRCode = (qrCodeUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = qrCodeUrl;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};