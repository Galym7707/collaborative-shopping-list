// File: frontend/src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useListStore } from '@/store/listStore';
import { useAuth } from '@/context/AuthContext';
import HomePage from '@/pages/HomePage';
import ListPage from '@/pages/ListPage';
import ProfilePage from '@/pages/ProfilePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import Layout from '@/components/Layout';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading: authLoading } = useAuth();
  const initializeSocket = useListStore(state => state.initializeSocket);

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (token) {
    initializeSocket(token);
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout>
              <HomePage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/list/:listId"
        element={
          <RequireAuth>
            <Layout>
              <ListPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Layout>
              <ProfilePage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;