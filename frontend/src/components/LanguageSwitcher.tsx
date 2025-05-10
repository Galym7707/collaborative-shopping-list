import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  return (
    <select
      value={i18n.language}
      onChange={e => i18n.changeLanguage(e.target.value)}
      className="btn btn-secondary"
    >
      <option value="en">EN</option>
      <option value="ru">RU</option>
      <option value="kk">KK</option>
    </select>
  );
}

export default LanguageSwitcher;
