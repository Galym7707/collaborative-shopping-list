// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\pages\LoginPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast'; // Для проверки пустых полей

const LoginPage: React.FC = () => {
  const { login, isLoggingIn } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null); // Локальное состояние ошибки

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); // Сброс ошибки

    if (!email || !password) {
        const errorMsg = t('auth.fillFields', 'Please fill in both email and password');
        setFormError(errorMsg);
        toast.error(errorMsg);
        return;
    }

    const errorResult = await login({ email, password });

    if (errorResult) {
      setFormError(errorResult); // Показываем ошибку на форме
    }
    // Успех и редирект обрабатываются внутри login
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-10 bg-white dark:bg-gray-800 shadow-xl rounded-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            {t('auth.loginTitle', 'Sign in to your account')}
          </h2>
        </div>
        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          {/* Отображение ошибки формы */}
          {formError && (
             <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
               {formError}
             </div>
           )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">{t('auth.emailLabel', 'Email address')}</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${formError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} placeholder-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder={t('auth.emailLabel', 'Email address')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isLoggingIn}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">{t('auth.passwordLabel', 'Password')}</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                 className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${formError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} placeholder-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder={t('auth.passwordLabel', 'Password')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLoggingIn}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? t('auth.loggingIn', 'Signing in...') : t('auth.loginButton', 'Sign in')}
            </button>
          </div>

          <div className="text-sm text-center">
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
              {t('auth.noAccount', "Don't have an account? Register")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;