import { redirect } from 'next/navigation';

export default function RootPage() {
  // Otomatis mengarahkan ke halaman login
  redirect('/login');
}