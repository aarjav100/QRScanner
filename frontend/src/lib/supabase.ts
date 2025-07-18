import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url?: string;
          created_at: string;
          updated_at: string;
          preferences: any;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
          preferences?: any;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
          preferences?: any;
        };
      };
      qr_codes: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          content: string;
          qr_code_url?: string;
          is_scanned: boolean;
          scanned_from?: string;
          tags?: string[];
          category?: string;
          is_favorite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          content: string;
          qr_code_url?: string;
          is_scanned?: boolean;
          scanned_from?: string;
          tags?: string[];
          category?: string;
          is_favorite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          content?: string;
          qr_code_url?: string;
          is_scanned?: boolean;
          scanned_from?: string;
          tags?: string[];
          category?: string;
          is_favorite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}