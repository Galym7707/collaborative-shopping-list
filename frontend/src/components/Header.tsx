// File: frontend/src/components/Header.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-blue-600 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          {t('header.title')}
        </Link>
        <nav className="flex space-x-4">
          {user ? (
            <>
              <Link to="/" className="hover:underline">
                {t('header.home')}
              </Link>
              <Link to="/profile" className="hover:underline">
                {t('header.profile')}
              </Link>
              <button
                onClick={handleLogout}
                className="hover:underline focus:outline-none"
              >
                {t('header.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:underline">
                {t('header.login')}
              </Link>
              <Link to="/register" className="hover:underline">
                {t('header.register')}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;