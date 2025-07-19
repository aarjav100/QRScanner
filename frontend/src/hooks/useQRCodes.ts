import { useState, useEffect } from 'react';
import { QRCodeData } from '../types';
import ApiService from '../services/api';

export const useQRCodes = (userId: string | null) => {
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadQRCodes();
    } else {
      setQrCodes([]);
    }
  }, [userId]);

  const loadQRCodes = async () => {
    if (!userId) {
      console.log('loadQRCodes: No userId provided, skipping load');
      return;
    }
    
    console.log('loadQRCodes: Loading QR codes for userId:', userId);
    setLoading(true);
    setError(null);
    
    try {
      const response = await ApiService.getQRCodes();
      console.log('loadQRCodes: API response:', response);
      if (response.success) {
        const mappedQRCodes = response.data.map((qr: any) => ({
          id: qr._id, // backend uses _id
          type: qr.type,
          title: qr.title,
          content: qr.content,
          createdAt: qr.createdAt, // backend uses createdAt
          qrCodeUrl: qr.qrCodeUrl || '', // backend uses qrCodeUrl
          isScanned: qr.isScanned,
          scannedFrom: qr.scannedFrom,
          userId: qr.userId, // backend uses userId
          tags: qr.tags || [],
          category: qr.category,
          isFavorite: qr.isFavorite || false
        }));
        console.log('loadQRCodes: Mapped QR codes:', mappedQRCodes);
        setQrCodes(mappedQRCodes);
      }
    } catch (err: any) {
      console.error('loadQRCodes: Error loading QR codes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveQRCode = async (qrData: Omit<QRCodeData, 'id' | 'createdAt'>) => {
    if (!userId) {
      console.log('saveQRCode: No userId provided, cannot save');
      return null;
    }
    
    console.log('saveQRCode: Saving QR code with data:', qrData);
    console.log('saveQRCode: User ID:', userId);
    
    try {
      const response = await ApiService.createQRCode({
        type: qrData.type,
        title: qrData.title,
        content: qrData.content,
        qrCodeUrl: qrData.qrCodeUrl,
        isScanned: qrData.isScanned || false,
        scannedFrom: qrData.scannedFrom,
        tags: qrData.tags || [],
        category: qrData.category,
        isFavorite: qrData.isFavorite || false,
        userId // <-- Add userId to payload
      });
      
      console.log('saveQRCode: API response:', response);
      
      if (response.success) {
        console.log('saveQRCode: Successfully saved, refreshing QR codes...');
        await loadQRCodes(); // Refresh the list
        return response.data;
      }
      return null;
    } catch (err: any) {
      console.error('saveQRCode: Error saving QR code:', err);
      setError(err.message);
      return null;
    }
  };

  const updateQRCode = async (id: string, updates: Partial<QRCodeData>) => {
    try {
      const response = await ApiService.updateQRCode(id, {
        title: updates.title,
        content: updates.content,
        qrCodeUrl: updates.qrCodeUrl,
        tags: updates.tags,
        category: updates.category,
        isFavorite: updates.isFavorite
      });
      
      if (response.success) {
        await loadQRCodes(); // Refresh the list
        return response.data;
      }
      return null;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  const deleteQRCode = async (id: string) => {
    try {
      const response = await ApiService.deleteQRCode(id);
      if (response.success) {
        await loadQRCodes(); // Refresh the list
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const clearAllQRCodes = async () => {
    if (!userId) return false;
    
    try {
      const response = await ApiService.deleteAllQRCodes();
      if (response.success) {
        setQrCodes([]);
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      const response = await ApiService.toggleFavorite(id);
      if (response.success) {
        await loadQRCodes(); // Refresh the list
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  return {
    qrCodes,
    loading,
    error,
    saveQRCode,
    updateQRCode,
    deleteQRCode,
    clearAllQRCodes,
    toggleFavorite,
    refreshQRCodes: loadQRCodes
  };
};