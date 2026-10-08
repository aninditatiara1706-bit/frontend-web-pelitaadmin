'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest, ApiUser, QueueRecord, Schedule } from '../../lib/api';

type Stats = { totalPeserta: number };
type Summary = { total: { terdaftar: number; diperiksa: number; belumDiperiksa: number } };

function dateKey(value: string | Date) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function Dashboard() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [queues, setQueues] = useState<QueueRecord[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const [userResponse, statsResponse, summaryResponse, queueResponse, scheduleResponse] = await Promise.all([
          apiRequest<ApiUser>('/auth/me'),
          apiRequest<Stats>(`/rekapitulasi/stats?periode=${period}`),
          apiRequest<Summary>(`/rekapitulasi/summary?periode=${period}`),
          apiRequest<QueueRecord[]>('/antrean'),
          apiRequest<Schedule[]>('/jadwal'),
        ]);
        if (!active) return;
        setUser(userResponse.data);
        setStats(statsResponse.data);
        setSummary(summaryResponse.data);
        setQueues(queueResponse.data);
        setSchedules(scheduleResponse.data);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Gagal memuat dashboard.');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadDashboard();
    return () => { active = false; };
  }, [period]);

  const today = dateKey(new Date());
  const todaySchedules = schedules.filter((item) => dateKey(item.tanggal) === today);
  const nextSchedules = schedules.filter((item) => dateKey(item.tanggal) >= today).slice(0, 4);

  return (
    <div className="min-h-screen bg-white p-4 font-sans text-gray-800 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Selamat Datang{user ? `, ${user.name}` : ''}</h1>
        <p className="mt-0.5 text-xs font-medium text-gray-500">Sistem Informasi Posyandu PELITA</p>
      </div>
      {errorMessage && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Peserta" value={stats?.totalPeserta} isLoading={isLoading} />
        <StatCard title="Antrean Aktif" value={queues.length} isLoading={isLoading} />
        <StatCard title="Sudah Diperiksa Bulan Ini" value={summary?.total.diperiksa} isLoading={isLoading} />
        <StatCard title="Belum Diperiksa Bulan Ini" value={summary?.total.belumDiperiksa} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <h2 className="bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] px-4 py-3 text-sm font-semibold text-white">Jadwal Posyandu Hari Ini</h2>
          {todaySchedules.length ? todaySchedules.map((schedule) => (
            <div key={schedule.id} className="border-b border-gray-100 p-5 last:border-0">
              <h3 className="text-base font-bold text-gray-900">{schedule.deskripsi?.split(' • ')[0] || schedule.lokasi}</h3>
              <p className="mt-1 text-xs font-medium text-gray-600">{schedule.deskripsi?.split(' • ')[1] || 'Waktu belum ditentukan'}</p>
              <p className="mt-1 text-sm text-gray-600">{schedule.lokasi}</p>
              <p className="mt-2 text-xs text-gray-500">{schedule._count?.antrean ?? 0} peserta terdaftar</p>
            </div>
          )) : <p className="p-5 text-sm text-gray-500">{isLoading ? 'Memuat jadwal...' : 'Tidak ada jadwal Posyandu hari ini.'}</p>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] px-4 py-3 text-white">
            <h2 className="text-sm font-semibold">Jadwal Mendatang</h2>
            <Link href="/jadwal-posyandu" className="text-xs font-medium underline underline-offset-2">Lihat semua</Link>
          </div>
          {nextSchedules.length ? nextSchedules.map((schedule) => (
            <div key={schedule.id} className="flex items-center justify-between gap-4 border-b border-gray-100 p-4 last:border-0">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{schedule.deskripsi?.split(' • ')[0] || schedule.lokasi}</h3>
                <p className="mt-1 text-xs text-gray-500">{schedule.lokasi} · {schedule.deskripsi?.split(' • ')[1] || 'Waktu belum ditentukan'}</p>
              </div>
              <time className="shrink-0 text-right text-xs font-semibold text-purple-700">{new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(schedule.tanggal))}</time>
            </div>
          )) : <p className="p-5 text-sm text-gray-500">{isLoading ? 'Memuat jadwal...' : 'Belum ada jadwal mendatang.'}</p>}
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, isLoading }: { title: string; value?: number; isLoading: boolean }) {
  return (
    <div className="flex h-36 flex-col justify-between rounded-2xl bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] p-5 text-white shadow-sm">
      <p className="text-sm font-semibold opacity-95">{title}</p>
      <h2 className="text-4xl font-extrabold tracking-tight">{isLoading ? '—' : value ?? 0}</h2>
    </div>
  );
}
