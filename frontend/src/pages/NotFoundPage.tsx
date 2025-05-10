import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => (
  <div className="text-center py-20">
    <h1 className="text-4xl font-bold">404</h1>
    <p className="mt-4">Page not found</p>
    <Link to="/" className="btn btn-secondary mt-6">
      Go Home
    </Link>
  </div>
);

export default NotFoundPage;
