// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\context\AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useListStore } from '../store/listStore'; // для дисконнекта и очистки стейта

// --- Типы ---
export interface UserInfo {
  _id: string;
  username: string;
  email: string;
}

export interface SharedWithEntry {
  user: UserInfo;
  role: 'viewer' | 'editor';
  status: 'pending' | 'accepted' | 'declined';
}

export interface List {
  _id: string;
  name: string;
  owner: UserInfo;
  items: Item[];
  sharedWith: SharedWithEntry[];
  createdAt: string;
  updatedAt: string;
}

interface AuthResponse {
  token: string;
  user: UserInfo;
  message?: string;
}
interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  loading: boolean;
  isLoggingIn: boolean;
  isRegistering: boolean;
  login: (credentials: { email: string; password?: string }) => Promise<string | undefined>;
  register: (userData: { username?: string; email: string; password?: string }) => Promise<string | undefined>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // При монтировании подтягиваем данные из localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      }
    }
    setLoading(false);
  }, []);

  // --- LOGIN ---
  const login = async (credentials: { email: string; password?: string }) => {
    setIsLoggingIn(true);
    let errorMessage: string | undefined;
    try {
      const response = await api<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      if (response.token && response.user) {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        setToken(response.token);
        setUser(response.user);
        toast.success(t('auth.loginSuccess') || 'Login successful!');
        navigate('/');
      } else {
        errorMessage = response.message || t('auth.loginError') || 'Login failed';
        toast.error(errorMessage);
      }
    } catch (err: any) {
      errorMessage =
        err.response?.data?.message ||
        err.message ||
        t('auth.loginError') ||
        'Login failed. Please check credentials.';
      toast.error(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
    return errorMessage;
  };

  // --- REGISTER ---
  const register = async (userData: { username?: string; email: string; password?: string }) => {
    setIsRegistering(true);
    let errorMessage: string | undefined;
    try {
      const response = await api<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      if (response.token && response.user) {
        // автоматически логиним после регистрации
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        setToken(response.token);
        setUser(response.user);
        toast.success(t('auth.registerSuccessGoHome') || 'Registered and logged in!');
        navigate('/');
      } else {
        errorMessage = response.message || t('auth.registerError') || 'Registration failed';
        toast.error(errorMessage);
      }
    } catch (err: any) {
      errorMessage =
        err.response?.data?.message ||
        err.message ||
        t('auth.registerError') ||
        'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsRegistering(false);
    }
    return errorMessage;
  };

  // --- LOGOUT ---
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);

    // Отключаем WS и очищаем стор
    const { disconnectSocket, clearLists, clearCurrentList } = useListStore.getState();
    disconnectSocket();
    // clearLists() нужно объявить в вашем listStore: set({ lists: [] })
    clearLists?.();
    clearCurrentList();

    toast.success(t('auth.logoutSuccess') || 'Logged out successfully.');
    navigate('/login');
  };

  const isAuthenticated = () => !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isLoggingIn,
        isRegistering,
        login,
        register,
        logout,
        isAuthenticated,
      }}
    >
      {!loading ? children : <div className="flex justify-center items-center h-screen">Auth Loading...</div>}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
