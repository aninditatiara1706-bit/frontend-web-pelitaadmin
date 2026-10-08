import type { Metadata } from 'next';
import './globals.css';
import AppLayout from '../components/AppLayout';

export const metadata: Metadata = {
  title: 'Pelita Admin',
  description: 'Sistem Informasi Posyandu',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-gray-50 font-sans antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}