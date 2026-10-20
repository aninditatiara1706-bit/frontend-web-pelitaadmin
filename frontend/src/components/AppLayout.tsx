'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    /* flex-col untuk HP (header di atas), md:flex-row untuk Desktop (sidebar di samping) */
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-gray-50">
      <Sidebar />

      {/* Hanya area main ini yang dapat di-scroll */}
      <main className="flex-1 h-full overflow-y-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}