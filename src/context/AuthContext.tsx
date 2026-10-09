import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { getCurrentUser, loginUser, registerUser, removeToken, getToken, updateProfile } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, preferredLanguage?: string) => Promise<void>;
  logout: () => void;
  updateUserPreferences: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const { user } = await getCurrentUser();
        setUser(user);
      } catch (err) {
        console.warn('[Auth] Session check failed, clearing token');
        removeToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const handleExpired = () => {
      setUser(null);
    };

    window.addEventListener('newsroom_auth_expired', handleExpired);
    return () => {
      window.removeEventListener('newsroom_auth_expired', handleExpired);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginUser(email, password);
    setUser(res.user);
  };

  const register = async (name: string, email: string, password: string, preferredLanguage = 'en') => {
    const res = await registerUser(name, email, password, preferredLanguage);
    setUser(res.user);
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  const updateUserPreferences = async (data: Partial<User>) => {
    const res = await updateProfile(data);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUserPreferences }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
