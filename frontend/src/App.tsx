// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\App.tsx
import React, { Suspense, useEffect } from 'react'; // Убрали useContext
import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { useAuth } from './context/AuthContext';
import { useListStore } from './store/listStore';

// Lazy load pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ListPage = React.lazy(() => import('./pages/ListPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));

// Protected Route Component
const RequireAuth: React.FC = () => { /* ... (без изменений) ... */ };

function App() {
    const { token, loading: authLoading } = useAuth();
    // Получаем функции напрямую из хука
    const connectSocket = useListStore(state => state.connectSocket);
    const disconnectSocket = useListStore(state => state.disconnectSocket);

    useEffect(() => {
        if (!authLoading) {
            if (token) {
                console.log("Auth token available, connecting socket...");
                connectSocket(token);
            } else {
                console.log("No auth token, disconnecting socket...");
                disconnectSocket();
            }
        }
        return () => {
             console.log("App unmounting or token changed, disconnecting socket...");
             disconnectSocket();
        };
     }, [token, authLoading, connectSocket, disconnectSocket]); // Добавляем функции в зависимости

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Header />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                 <Suspense fallback={<div className="flex justify-center items-center h-[calc(100vh-160px)]">Loading Page...</div>}>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route element={<RequireAuth />}>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/list/:id" element={<ListPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                        </Route>
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                 </Suspense>
            </main>
            <Footer />
        </div>
    );
}
export default App;