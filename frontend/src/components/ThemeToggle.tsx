// File: frontend/src/components/ThemeToggle.tsx
import React, { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

const ThemeToggle: React.FC = () => {
  const theme = useThemeStore(s => s.theme);
  const toggleTheme = useThemeStore(s => s.toggleTheme);

  useEffect(() => {
    // Устанавливаем начальную тему на основе сохранённого значения или системных настроек
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = theme || (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, [theme]);

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition duration-150 ease-in-out"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <MoonIcon className="h-6 w-6" />
      ) : (
        <SunIcon className="h-6 w-6" />
      )}
    </button>
  );
};

export default ThemeToggle;