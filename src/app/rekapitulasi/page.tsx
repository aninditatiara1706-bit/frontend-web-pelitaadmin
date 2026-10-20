'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Search } from 'lucide-react';
import { apiRequest, Category, displayCategory, Examination } from '../../lib/api';

type Stats = {
  totalPeserta: number;
  perKategori: Record<Category, number>;
  pesertaBaruPeriode: number;
  pesertaBaruBulanSebelumnya: number;
  perubahanPersen: number | null;
};

type SummaryCounts = { terdaftar: number; diperiksa: number; belumDiperiksa: number };
type Summary = {
  perKategori: Record<Category, SummaryCounts>;
  total: SummaryCounts;
};
type Trend = { periode: string; jumlahPelayanan: number };

const categories: Category[] = ['BALITA', 'IBU_HAMIL', 'LANSIA'];
const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

function monthLabel(period: string) {
  const [year, month] = period.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year!, month! - 1, 1));
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));
}

export default function RekapitulasiPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState<Category | ''>('');
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<Stats | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [history, setHistory] = useState<Examination[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPages, setHistoryPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage('');
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search.trim()) params.set('q', search.trim());
      if (kategori) params.set('kategori', kategori);
      try {
        const [statsResponse, summaryResponse, trendResponse, historyResponse] = await Promise.all([
          apiRequest<Stats>(`/rekapitulasi/stats?periode=${period}`, { signal: controller.signal }),
          apiRequest<Summary>(`/rekapitulasi/summary?periode=${period}`, { signal: controller.signal }),
          apiRequest<Trend[]>('/rekapitulasi/trends', { signal: controller.signal }),
          apiRequest<Examination[]>(`/rekapitulasi/riwayat?${params}`, { signal: controller.signal }),
        ]);
        setStats(statsResponse.data);
        setSummary(summaryResponse.data);
        setTrends(trendResponse.data);
        setHistory(historyResponse.data);
        setHistoryTotal(historyResponse.meta?.total ?? historyResponse.data.length);
        setHistoryPages(historyResponse.meta?.totalPages ?? 1);
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(error instanceof Error ? error.message : 'Gagal memuat data rekapitulasi.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [period, page, search, kategori]);

  const trendMaximum = Math.max(...trends.map((item) => item.jumlahPelayanan), 1);
  const trendPoints = useMemo(() => {
    if (!trends.length) return '';
    return trends.map((item, index) => {
      const x = trends.length === 1 ? 200 : (index / (trends.length - 1)) * 360 + 20;
      const y = 180 - (item.jumlahPelayanan / trendMaximum) * 150;
      return `${x},${y}`;
    }).join(' ');
  }, [trends, trendMaximum]);

  const changeLabel = stats?.perubahanPersen == null
    ? 'Belum ada pembanding'
    : `${stats.perubahanPersen > 0 ? '+' : ''}${stats.perubahanPersen}% dari bulan lalu`;

  return (
    <div className="space-y-6 p-4 md:p-6 xl:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Rekapitulasi Data Pelayanan</h1>
        <p className="max-w-3xl text-sm text-slate-600 md:text-base">Ringkasan peserta dan pelayanan Posyandu berdasarkan data yang tercatat.</p>
      </header>

      {errorMessage && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}

      <label className="inline-flex items-center gap-3 rounded-2xl border border-violet-200 bg-white px-4 py-3 shadow-sm">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><CalendarDays size={22} /></span>
        <span>
          <span className="block text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Periode</span>
          <span className="block text-sm font-semibold text-slate-800">{monthLabel(period)}</span>
        </span>
        <input aria-label="Pilih periode" type="month" value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); }} className="ml-2 max-w-[145px] rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700" />
      </label>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Peserta" value={stats?.totalPeserta} comparison={changeLabel} />
        {categories.map((category) => (
          <StatCard key={category} title={displayCategory(category)} value={stats?.perKategori[category]} comparison="Peserta terdaftar" />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-800">Rekap Pelayanan · {monthLabel(period)}</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3 font-semibold">Kategori</th><th className="px-4 py-3 font-semibold">Terdaftar</th><th className="px-4 py-3 font-semibold">Diperiksa</th><th className="px-4 py-3 font-semibold">Belum Diperiksa</th></tr></thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                {categories.map((category) => {
                  const counts = summary?.perKategori[category];
                  return <tr key={category}><td className="px-4 py-3">{displayCategory(category)}</td><td className="px-4 py-3">{counts?.terdaftar ?? '—'}</td><td className="px-4 py-3">{counts?.diperiksa ?? '—'}</td><td className="px-4 py-3">{counts?.belumDiperiksa ?? '—'}</td></tr>;
                })}
                <tr className="bg-violet-50 font-semibold text-violet-900"><td className="px-4 py-3">Total</td><td className="px-4 py-3">{summary?.total.terdaftar ?? '—'}</td><td className="px-4 py-3">{summary?.total.diperiksa ?? '—'}</td><td className="px-4 py-3">{summary?.total.belumDiperiksa ?? '—'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-800">Tren Jumlah Pelayanan</h2>
            <span className="flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700"><span className="h-2.5 w-2.5 rounded-full bg-violet-500" />Pelayanan</span>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            {trends.length ? (
              <>
                <div className="relative h-56 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="absolute inset-0 grid grid-rows-4">{[0, 1, 2, 3].map((item) => <div key={item} className="border-b border-slate-200" />)}</div>
                  <svg className="absolute inset-0 h-full w-full text-violet-500" viewBox="0 0 400 200" preserveAspectRatio="none">
                    <polyline points={trendPoints} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {trendPoints.split(' ').map((point, index) => {
                      const [x, y] = point.split(',');
                      return <circle key={index} cx={x} cy={y} r="5" fill="currentColor" />;
                    })}
                  </svg>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {trends.map((item) => <div key={item.periode} className="rounded-xl bg-white p-2"><p className="text-xs text-slate-500">{monthLabel(item.periode)}</p><p className="mt-1 font-bold text-violet-700">{item.jumlahPelayanan}</p></div>)}
                </div>
                <p className="mt-2 text-right text-xs text-slate-400">Skala tertinggi {trendMaximum}</p>
              </>
            ) : <p className="py-16 text-center text-sm text-slate-500">{isLoading ? 'Memuat tren...' : 'Belum ada data pelayanan.'}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-800">Riwayat Pemeriksaan</h2>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500 focus-within:border-violet-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-100">
            <Search size={18} />
            <input type="search" placeholder="Cari nama peserta atau NIK..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="w-full border-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none" />
          </label>
          <select value={kategori} onChange={(event) => { setKategori(event.target.value as Category | ''); setPage(1); }} className="w-full max-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            <option value="">Semua Kategori</option>
            {categories.map((category) => <option key={category} value={category}>{displayCategory(category)}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3 font-semibold">No</th><th className="px-4 py-3 font-semibold">Nama Peserta / NIK</th><th className="px-4 py-3 font-semibold">Kategori</th><th className="px-4 py-3 font-semibold">Tanggal</th><th className="px-4 py-3 font-semibold">Jadwal</th></tr></thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
              {history.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{(page - 1) * 10 + index + 1}</td>
                  <td className="px-4 py-3"><strong className="font-semibold text-slate-800">{item.peserta.nama}</strong><span className="block text-xs text-slate-500">{item.peserta.nik}</span></td>
                  <td className="px-4 py-3">{displayCategory(item.peserta.kategori)}</td>
                  <td className="px-4 py-3">{dateLabel(item.tanggalPemeriksaan)}</td>
                  <td className="px-4 py-3">{item.jadwal.lokasi}</td>
                </tr>
              ))}
              {!history.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{isLoading ? 'Memuat riwayat...' : 'Data pemeriksaan tidak ditemukan.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>Menampilkan {history.length} dari {historyTotal} data</span>
          <div className="flex items-center gap-3">
            <button type="button" disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-40">Sebelumnya</button>
            <span>Halaman {page} dari {historyPages}</span>
            <button type="button" disabled={page >= historyPages || isLoading} onClick={() => setPage((value) => Math.min(historyPages, value + 1))} className="rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-40">Berikutnya</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, comparison }: { title: string; value?: number; comparison: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <h3 className="text-3xl font-bold tracking-tight text-slate-900">{value ?? '—'}</h3>
        <span className="max-w-[60%] rounded-full bg-violet-50 px-2 py-1 text-right text-xs font-semibold text-violet-700">{comparison}</span>
      </div>
    </div>
  );
}
