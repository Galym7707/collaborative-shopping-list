// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\App.tsx
import React, { Suspense, useEffect, useContext } from 'react'; // Добавил useContext для RequireAuth (хотя лучше useAuth)
import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { useAuth } from './context/AuthContext'; // Используем useAuth
import { useListStore } from './store/listStore'; // Import store

// Lazy load pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ListPage = React.lazy(() => import('./pages/ListPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
// import SharedListPage from "./pages/SharedListPage"; // <-- ЭТА СТРОКА УДАЛЕНА

const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));

// Protected Route Component
const RequireAuth: React.FC = () => {
    const auth = useAuth(); // Используем useAuth для доступа к контексту
    const location = useLocation();

    if (auth.loading) {
        // Optional: Show a loading spinner while checking auth state
        return <div className="flex justify-center items-center h-screen">Auth Loading...</div>;
    }

    if (!auth.isAuthenticated()) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />; // Render child routes if authenticated
};


function App() {
    // Connect/Disconnect WebSocket based on auth state
    const { token, loading: authLoading } = useAuth();
    const connectSocket = useListStore((state) => state.connectSocket);
    const disconnectSocket = useListStore((state) => state.disconnectSocket);

    useEffect(() => {
        // Only manage socket connection once auth state is determined
        if (!authLoading) {
            if (token) {
                console.log("Auth token available, connecting socket...");
                connectSocket(token);
            } else {
                console.log("No auth token, disconnecting socket...");
                disconnectSocket();
            }
        }

        // Cleanup on unmount or token change
        return () => {
             console.log("App unmounting or token changed, disconnecting socket...");
             disconnectSocket();
        };
     }, [token, authLoading, connectSocket, disconnectSocket]);


    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Header />
            {/* Добавил отступы для main */}
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                 <Suspense fallback={<div className="flex justify-center items-center h-[calc(100vh-160px)]">Loading Page...</div>}> {/* Скорректировал высоту */}
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />

                        {/* Protected Routes */}
                        <Route element={<RequireAuth />}>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/list/:id" element={<ListPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                        </Route>

                        {/* Catch All */}
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                 </Suspense>
            </main>
            <Footer />
        </div>
    );
}

export default App;