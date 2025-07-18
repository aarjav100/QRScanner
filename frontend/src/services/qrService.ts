import { supabase } from '../lib/supabase';
import { QRCodeData } from '../types';

export class QRService {
  static async createQRCode(qrData: Omit<QRCodeData, 'id' | 'createdAt'>, userId: string) {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .insert({
          user_id: userId,
          type: qrData.type,
          title: qrData.title,
          content: qrData.content,
          qr_code_url: qrData.qrCodeUrl,
          is_scanned: qrData.isScanned || false,
          scanned_from: qrData.scannedFrom,
          tags: qrData.tags || [],
          category: qrData.category,
          is_favorite: qrData.isFavorite || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { data: this.mapToQRCodeData(data), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async getUserQRCodes(userId: string) {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const qrCodes = data?.map(this.mapToQRCodeData) || [];
      return { data: qrCodes, error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  }

  static async updateQRCode(id: string, updates: Partial<QRCodeData>) {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .update({
          title: updates.title,
          content: updates.content,
          qr_code_url: updates.qrCodeUrl,
          tags: updates.tags,
          category: updates.category,
          is_favorite: updates.isFavorite,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: this.mapToQRCodeData(data), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async deleteQRCode(id: string) {
    try {
      const { error } = await supabase
        .from('qr_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  static async deleteAllUserQRCodes(userId: string) {
    try {
      const { error } = await supabase
        .from('qr_codes')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  private static mapToQRCodeData(dbData: any): QRCodeData {
    return {
      id: dbData.id,
      type: dbData.type,
      title: dbData.title,
      content: dbData.content,
      createdAt: dbData.created_at,
      qrCodeUrl: dbData.qr_code_url || '',
      isScanned: dbData.is_scanned,
      scannedFrom: dbData.scanned_from,
      userId: dbData.user_id,
      tags: dbData.tags || [],
      category: dbData.category,
      isFavorite: dbData.is_favorite
    };
  }

  static subscribeToUserQRCodes(userId: string, callback: (qrCodes: QRCodeData[]) => void) {
    return supabase
      .channel('qr_codes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'qr_codes',
          filter: `user_id=eq.${userId}`
        },
        async () => {
          const { data } = await this.getUserQRCodes(userId);
          callback(data);
        }
      )
      .subscribe();
  }
}