// File: ShopSmart/frontend/src/components/ThemeToggle.tsx
import React from 'react';
import { useThemeStore } from '../store/themeStore';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'; // Импорт иконок

const ThemeToggle: React.FC = () => {
  const theme = useThemeStore(s => s.theme);
  const toggle = useThemeStore(s => s.toggleTheme);

  // Устанавливаем тему при загрузке компонента (если еще не установлена)
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <button
        onClick={toggle}
        className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition duration-150 ease-in-out"
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} // Для доступности
    >
      {theme === 'light' ? (
        <MoonIcon className="h-6 w-6" /> // Иконка луны для светлой темы
      ) : (
        <SunIcon className="h-6 w-6" /> // Иконка солнца для темной темы
      )}
    </button>
  );
}

export default ThemeToggle;