'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from './sidebar';
import { apiRequest, ApiUser } from '../lib/api';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    if (isLoginPage) {
      setIsCheckingSession(false);
      return;
    }

    let active = true;
    setIsCheckingSession(true);
    apiRequest<ApiUser>('/auth/me')
      .then(() => {
        if (active) setIsAuthenticated(true);
      })
      .catch(() => {
        if (active) {
          setIsAuthenticated(false);
          router.replace('/login?reason=session');
        }
      })
      .finally(() => {
        if (active) setIsCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [isLoginPage, pathname, router]);

  // Jika di halaman login, tampilkan hanya konten tanpa sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isCheckingSession || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-5 text-sm font-medium text-gray-500">
        Memeriksa sesi...
      </main>
    );
  }

  // Untuk halaman selain login, tampilkan sidebar + konten
  return (
    <div className="flex min-h-screen flex-col overflow-hidden md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
