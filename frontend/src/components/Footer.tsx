import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="mt-12 text-center text-sm text-gray-600 dark:text-gray-400 py-4">
      © {new Date().getFullYear()} ShopSmart. All rights reserved.
    </footer>
  );
};

export default Footer;
