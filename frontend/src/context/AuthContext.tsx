// File: frontend/src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/api';

interface UserInfo {
  _id: string;
  username: string;
  email: string;
  token?: string;
}

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  loading: boolean;
  isLoggingIn: boolean;
  isRegistering: boolean;
  login: (credentials: { email: string; password: string }) => Promise<string | null>;
  register: (credentials: { username: string; email: string; password: string }) => Promise<string | null>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          const userData = await api<UserInfo>('/auth/me', {
            method: 'GET',
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          setUser(userData);
          setToken(storedToken);
        }
      } catch (err) {
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async ({ email, password }: { email: string; password: string }): Promise<string | null> => {
    setIsLoggingIn(true);
    try {
      const response = await api<{ user: UserInfo; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem('token', response.token);
      return null;
    } catch (err: any) {
      const message = err.message || 'Login failed';
      return message;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const register = async ({
    username,
    email,
    password,
  }: {
    username: string;
    email: string;
    password: string;
  }): Promise<string | null> => {
    setIsRegistering(true);
    try {
      const response = await api<{ user: UserInfo; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem('token', response.token);
      return null;
    } catch (err: any) {
      const message = err.message || 'Registration failed';
      return message;
    } finally {
      setIsRegistering(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const isAuthenticated = () => !!token;

  return (
    <AuthContext.Provider value={{ user, token, loading, isLoggingIn, isRegistering, login, register, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};