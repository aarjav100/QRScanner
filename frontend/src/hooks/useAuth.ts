import { useState, useEffect } from 'react';
import { User } from '../types';
import ApiService from '../services/api';

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        ApiService.setToken(token);
        const response = await ApiService.getCurrentUser();
        if (response.success) {
          const userData = response.user;
          setUser({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar,
            createdAt: userData.createdAt,
            preferences: userData.preferences || {
              theme: 'light',
              defaultQRSize: 300,
              autoSave: true,
              showTutorial: true,
              notifications: true,
              exportFormat: 'png'
            }
          });
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
      ApiService.setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await ApiService.login({ email, password });
      
      if (response.success) {
        ApiService.setToken(response.token);
        const userData = response.user;
        setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          avatar: userData.avatar,
          createdAt: userData.createdAt,
          preferences: userData.preferences || {
            theme: 'light',
            defaultQRSize: 300,
            autoSave: true,
            showTutorial: true,
            notifications: true,
            exportFormat: 'png'
          }
        });
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await ApiService.register({ name, email, password });
      
      if (response.success) {
        ApiService.setToken(response.token);
        const userData = response.user;
        setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          avatar: userData.avatar,
          createdAt: userData.createdAt,
          preferences: userData.preferences || {
            theme: 'light',
            defaultQRSize: 300,
            autoSave: true,
            showTutorial: true,
            notifications: true,
            exportFormat: 'png'
          }
        });
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    localStorage.removeItem('authToken');
    ApiService.setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setLoading(false);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (user) {
      try {
        const response = await ApiService.updateProfile(updates);
        if (response.success) {
          const userData = response.user;
          setUser({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar,
            createdAt: userData.createdAt,
            preferences: userData.preferences
          });
        }
      } catch (error) {
        console.error('Error updating user:', error);
      }
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    updateUser
  };
};