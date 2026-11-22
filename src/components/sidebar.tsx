'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';
import {
  Menu,
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  FileText,
  LogOut,
  X,
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Data Peserta', href: '/data-peserta', icon: Users },
  { name: 'Jadwal Posyandu', href: '/jadwal-posyandu', icon: Calendar },
  { name: 'Pendaftaran & Antrean', href: '/pendaftaran-antrean', icon: ClipboardList },
  { name: 'Rekapitulasi', href: '/rekapitulasi', icon: FileText },
];

function Brand({ compact = false }: { compact?: boolean }) {
  const logoSize = compact ? 48 : 64;

  return (
    <span className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="Logo Pelita"
        width={logoSize}
        height={logoSize}
        priority
        className="h-auto w-12 shrink-0 object-contain sm:w-14"
      />
      <span className={`font-extrabold tracking-[0.12em] text-white ${compact ? 'text-lg sm:text-xl' : 'text-2xl'}`}>
        PELITA
      </span>
    </span>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isMobileMenuOpen]);

  const renderMenuItems = (mobile = false) =>
    menuItems.map((item) => {
      const IconComponent = item.icon;
      const isActive = pathname === item.href;

      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive ? 'page' : undefined}
          onClick={() => mobile && setIsMobileMenuOpen(false)}
          className={`group flex min-h-12 items-center gap-3.5 rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
            isActive
              ? 'bg-white font-semibold text-purple-700 shadow-lg shadow-purple-950/10'
              : 'font-medium text-purple-100 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
            isActive ? 'bg-purple-100 text-purple-700' : 'text-purple-100 group-hover:bg-white/10 group-hover:text-white'
          }`}>
            <IconComponent size={18} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">{item.name}</span>
          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />}
        </Link>
      );
    });

  const logoutLink = (mobile = false) => (
    <button
      type="button"
      onClick={async () => {
        try {
          await apiRequest<null>('/auth/logout', { method: 'POST' });
          if (mobile) setIsMobileMenuOpen(false);
          router.replace('/login');
        } catch (error) {
          window.alert(error instanceof Error ? error.message : 'Gagal keluar.');
        }
      }}
      className="flex min-h-12 items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium text-red-100 transition-colors duration-200 hover:bg-red-500/20 hover:text-white"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
        <LogOut size={18} />
      </span>
      <span>Keluar</span>
    </button>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col bg-purple-600 text-white shadow-xl md:sticky md:top-0 md:flex md:h-screen">
        <div className="flex items-center px-6 pb-8 pt-7">
          <Link href="/dashboard" aria-label="Pelita Admin - Dashboard" className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-purple-600">
            <Brand />
          </Link>
        </div>

        <div className="px-4">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-purple-200/80">
            Menu utama
          </p>
          <nav aria-label="Navigasi utama" className="flex flex-col gap-1.5">
            {renderMenuItems()}
          </nav>
        </div>

        <div className="mt-auto px-4 pb-5 pt-6">
          <div className="mb-3 border-t border-white/15" />
          {logoutLink()}
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-purple-500/70 bg-purple-600 text-white shadow-md md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" aria-label="Pelita Admin - Dashboard" className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white">
            <Brand compact />
          </Link>
          <button
            type="button"
            aria-label={isMobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-sidebar"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-inset ring-white/15 transition duration-200 hover:bg-white/25 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {isMobileMenuOpen ? <X size={21} /> : <Menu size={22} strokeWidth={2.2} />}
          </button>
        </div>
      </header>

      <div
        className={`pointer-events-none fixed inset-0 z-50 md:hidden ${isMobileMenuOpen ? 'pointer-events-auto' : ''}`}
        aria-hidden={!isMobileMenuOpen}
        inert={!isMobileMenuOpen}
      >
        <button
          type="button"
          aria-label="Tutup menu navigasi"
          tabIndex={isMobileMenuOpen ? 0 : -1}
          className={`absolute inset-0 h-full w-full bg-slate-950/55 opacity-0 transition-opacity duration-300 ease-out motion-reduce:transition-none ${isMobileMenuOpen ? 'opacity-100' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <aside
          id="mobile-sidebar"
          aria-label="Menu navigasi mobile"
          className={`relative flex h-full w-[min(19rem,86vw)] flex-col bg-purple-600 text-white shadow-2xl transition-[translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between border-b border-white/15 px-5 py-5">
            <Link
              href="/dashboard"
              aria-label="Pelita Admin - Dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Brand compact />
            </Link>
            <button
              type="button"
              aria-label="Tutup menu navigasi"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-purple-100 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X size={21} />
            </button>
          </div>

          <div className="px-4 pt-6">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-purple-200/80">
              Menu utama
            </p>
            <nav aria-label="Navigasi utama" className="flex flex-col gap-1.5">
              {renderMenuItems(true)}
            </nav>
          </div>

          <div className="mt-auto px-4 pb-5 pt-6">
            <div className="mb-3 border-t border-white/15" />
            {logoutLink(true)}
          </div>
        </aside>
      </div>
    </>
  );
}



