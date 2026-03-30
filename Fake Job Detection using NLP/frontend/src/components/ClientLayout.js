'use client';

import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Navbar from '@/components/Navbar';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';

export default function ClientLayout({ children }) {
    const pathname = usePathname();
    const hideNav = pathname === '/login' || pathname === '/register';

    return (
        <ThemeProvider>
            <AuthProvider>
                {!hideNav && <Navbar />}
                <main>{children}</main>
                <Toaster position="top-right" toastOptions={{ duration: 2500 }} />
            </AuthProvider>
        </ThemeProvider>
    );
}
