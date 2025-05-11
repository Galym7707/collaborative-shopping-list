// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\context\AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import toast from 'react-hot-toast'; // Убрали ToastOptions, ReactNode для toast достаточен
import { useTranslation } from 'react-i18next';
import { useListStore } from '../store/listStore';
import { UserInfo, Item } from '../store/listTypes'; // Импортируем Item

// Убираем дублирующиеся определения List, SharedWithEntry, т.к. они в listTypes
// export interface SharedWithEntry { ... }
// export interface List { ... }

interface AuthResponse { token: string; user: UserInfo; message?: string; }
interface AuthContextType {
  user: UserInfo | null; token: string | null; loading: boolean; isLoggingIn: boolean;
  isRegistering: boolean; login: (credentials: { email: string; password?: string }) => Promise<string | undefined>;
  register: (userData: { username?: string; email: string; password?: string }) => Promise<string | undefined>;
  logout: () => void; isAuthenticated: () => boolean;
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

  useEffect(() => { /* ... */ }, []);

  const login = async (credentials: { email: string; password?: string }) => {
    setIsLoggingIn(true); let errorMessage: string | undefined;
    try {
      const response = await api<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
      if (response.token && response.user) { /* ... */ } else { errorMessage = response.message || t('auth.loginError'); toast.error(errorMessage); }
    } catch (err: any) { errorMessage = err.data?.message || err.message || t('auth.loginError'); toast.error(errorMessage); }
    finally { setIsLoggingIn(false); } return errorMessage;
  };
  const register = async (userData: { username?: string; email: string; password?: string }) => {
    setIsRegistering(true); let errorMessage: string | undefined;
    try {
      const response = await api<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
      if (response.token && response.user) { /* ... */ toast.success(t('auth.registerSuccessGoLogin') || 'Registered! Please log in.'); navigate('/login'); }
      else { errorMessage = response.message || t('auth.registerError'); toast.error(errorMessage); }
    } catch (err: any) { errorMessage = err.data?.message || err.message || t('auth.registerError'); toast.error(errorMessage); }
    finally { setIsRegistering(false); } return errorMessage;
  };

  const logout = () => {
    localStorage.removeItem('authToken'); localStorage.removeItem('authUser');
    setToken(null); setUser(null);
    const { disconnectSocket, setLists, clearCurrentList } = useListStore.getState();
    disconnectSocket();
    setLists([]); // Используем setLists для очистки
    clearCurrentList();
    toast.success(t('auth.logoutSuccess') || 'Logged out successfully.'); navigate('/login');
  };

  const isAuthenticated = () => !!token;
  return ( <AuthContext.Provider value={{ user, token, loading, isLoggingIn, isRegistering, login, register, logout, isAuthenticated }}> {!loading ? children : <div className="flex justify-center items-center h-screen">Auth Loading...</div>} </AuthContext.Provider> );
};
export const useAuth = (): AuthContextType => { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used within AuthProvider'); return ctx; };