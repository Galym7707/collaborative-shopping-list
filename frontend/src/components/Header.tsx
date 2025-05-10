// File: ShopSmart/frontend/src/components/Header.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle      from './ThemeToggle';
import { useAuth }      from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Header: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        {/* logo */}
        <Link
          to="/"
          className="text-2xl font-bold text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity"
        >
          ShopSmart
        </Link>

        {/* right‑side controls */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <LanguageSwitcher />
          <ThemeToggle />

          {isAuthenticated() ? (
            /* ---------- logged‑in ---------- */
            <>
              <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">
                {t('header.welcome', 'Hi')}, {user?.username || t('common.guest')}
              </span>

              {/* profile link (visible only when logged in) */}
              <Link
                to="/profile"
                className="text-sm font-medium text-gray-600 hover:text-blue-600
                           dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
              >
                {t('header.profile', 'Profile')}
              </Link>

              <button
                onClick={logout}
                className="btn btn-secondary text-sm px-3 py-1.5"
              >
                {t('header.logout', 'Logout')}
              </button>
            </>
          ) : (
            /* ---------- guest ---------- */
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-gray-600 hover:text-blue-600
                           dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
              >
                {t('header.login', 'Login')}
              </Link>
              <Link
                to="/register"
                className="btn btn-primary text-sm px-3 py-1.5"
              >
                {t('header.register', 'Register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
