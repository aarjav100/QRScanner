import { supabase } from '../lib/supabase';
import { User, UserPreferences } from '../types';

export class AuthService {
  static async signUp(email: string, password: string, name: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create user profile
        await this.createUserProfile(data.user.id, {
          email,
          name,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          preferences: {
            theme: 'light',
            defaultQRSize: 300,
            autoSave: true,
            showTutorial: true,
            notifications: true,
            exportFormat: 'png'
          }
        });
      }

      return { user: data.user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  }

  static async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  }

  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  static async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await this.getUserProfile(user.id);
        return { user: profile, error: null };
      }
      return { user: null, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  }

  static async createUserProfile(userId: string, profileData: any) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return data;
  }

  static async getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (data) {
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        avatar: data.avatar_url,
        createdAt: data.created_at,
        preferences: data.preferences || {
          theme: 'light',
          defaultQRSize: 300,
          autoSave: true,
          showTutorial: true,
          notifications: true,
          exportFormat: 'png'
        }
      };
    }

    return null;
  }

  static async updateUserProfile(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        email: updates.email,
        avatar_url: updates.avatar,
        preferences: updates.preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return data;
  }

  static onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await this.getUserProfile(session.user.id);
        callback(profile);
      } else {
        callback(null);
      }
    });
  }
}