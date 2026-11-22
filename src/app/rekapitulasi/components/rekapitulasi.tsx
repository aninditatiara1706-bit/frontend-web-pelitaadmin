'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { apiRequest, Category, displayCategory, Examination } from '../../../lib/api';

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
type TrendRange = 3 | 6 | 12;

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
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export default function RekapitulasiPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState<Category | ''>('');
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<Stats | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [trendRange, setTrendRange] = useState<TrendRange>(3);
  const [selectedTrendIndex, setSelectedTrendIndex] = useState<number | null>(null);
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

  const handleOpenDetail = (item: Examination) => {
    if (typeof window === 'undefined') return;
    const rawItem = item as Record<string, unknown>;
    const constructedQueue = {
      id: String(rawItem.antreanId ?? item.id),
      pesertaId: item.pesertaId,
      jadwalId: item.jadwalId,
      noAntrean: Number(rawItem.noAntrean ?? 0),
      tanggal: String(rawItem.tanggalPemeriksaan ?? new Date().toISOString()),
      status: 'SELESAI' as const,
      peserta: item.peserta,
      jadwal: item.jadwal,
    };

    const payload = JSON.stringify({
      queue: constructedQueue,
      examination: rawItem,
    });

    window.sessionStorage.setItem(`hasil-pemeriksaan:${item.id}`, payload);
    window.sessionStorage.setItem(`hasil-pemeriksaan:${item.pesertaId}:${item.jadwalId}`, payload);
  };

  const visibleTrends = useMemo(() => {
    if (!trends.length) return [];
    return trends.slice(-trendRange);
  }, [trends, trendRange]);

  const trendMaximum = Math.max(...visibleTrends.map((item) => item.jumlahPelayanan), 100);
  const yAxisTicks = useMemo(() => {
    const step = Math.ceil(trendMaximum / 5);
    return [step * 5, step * 4, step * 3, step * 2, step, 0];
  }, [trendMaximum]);

  const trendCoords = useMemo(() => {
    if (!visibleTrends.length) return [];
    const maxScale = yAxisTicks[0] || 100;
    return visibleTrends.map((item, index) => {
      const x = visibleTrends.length === 1 ? 200 : (index / (visibleTrends.length - 1)) * 340 + 30;
      const y = 165 - (item.jumlahPelayanan / maxScale) * 140;
      return { x, y, value: item.jumlahPelayanan, periode: item.periode };
    });
  }, [visibleTrends, yAxisTicks]);

  const trendPoints = useMemo(() => {
    return trendCoords.map((pt) => `${pt.x},${pt.y}`).join(' ');
  }, [trendCoords]);

  const percentText = stats?.perubahanPersen != null
    ? `${stats.perubahanPersen > 0 ? '↑' : stats.perubahanPersen < 0 ? '↓' : ''}${Math.abs(stats.perubahanPersen)}%`
    : undefined;

  return (
    <div className="space-y-6 bg-white p-4 md:p-6 xl:p-8 text-slate-900">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-[26px]">Rekapitulasi Data Pelayanan</h1>
        <p className="text-xs text-slate-600 md:text-sm">Ringkasan data dari peserta dan layanan Posyandu secara otomatis dari hasil input kader</p>
      </header>

      {errorMessage && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}

      <div>
        <label className="relative inline-flex min-w-[270px] cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-400 bg-white px-4 py-2.5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-purple-500 text-purple-600">
              <CalendarDays size={22} strokeWidth={1.75} />
            </span>
            <div>
              <span className="block text-[11px] font-medium text-slate-500">Periode</span>
              <span className="block text-sm font-semibold text-slate-900">{monthLabel(period)}</span>
            </div>
          </div>
          <ChevronDown size={18} className="text-slate-800" />
          <input
            aria-label="Pilih periode"
            type="month"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              setPage(1);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Peserta"
          value={stats?.totalPeserta}
          percent={percentText}
          subtitle={stats?.perubahanPersen == null ? 'Belum ada pembanding' : 'dibanding bulan lalu'}
        />
        {categories.map((category) => (
          <StatCard
            key={category}
            title={displayCategory(category)}
            value={stats?.perKategori[category]}
            percent={percentText}
            subtitle="dibanding bulan lalu"
          />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        {/* Rekap Pelayanan */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Rekap Pelayanan</h2>
          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="min-w-full border-collapse text-center text-sm">
              <thead>
                <tr className="bg-[#8E3CCB] text-white">
                  <th className="border-r border-slate-700 px-4 py-2.5 font-medium">Kategori</th>
                  <th className="border-r border-slate-700 px-4 py-2.5 font-medium">Terdaftar</th>
                  <th className="border-r border-slate-700 px-4 py-2.5 font-medium">Diperiksa</th>
                  <th className="px-4 py-2.5 font-medium">Belum Diperiksa</th>
                </tr>
              </thead>
              <tbody className="bg-white text-slate-900">
                {categories.map((category) => {
                  const counts = summary?.perKategori[category];
                  return (
                    <tr key={category} className="border-t border-slate-700">
                      <td className="border-r border-slate-700 px-4 py-3 font-medium">{displayCategory(category)}</td>
                      <td className="border-r border-slate-700 px-4 py-3">{counts?.terdaftar ?? '—'}</td>
                      <td className="border-r border-slate-700 px-4 py-3">{counts?.diperiksa ?? '—'}</td>
                      <td className="px-4 py-3">{counts?.belumDiperiksa ?? '—'}</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-slate-700 font-semibold text-slate-950">
                  <td className="border-r border-slate-700 px-4 py-3">Total</td>
                  <td className="border-r border-slate-700 px-4 py-3">{summary?.total.terdaftar ?? '—'}</td>
                  <td className="border-r border-slate-700 px-4 py-3">{summary?.total.diperiksa ?? '—'}</td>
                  <td className="px-4 py-3">{summary?.total.belumDiperiksa ?? '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tren Jumlah Pelayanan */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-950">Tren Jumlah Pelayanan</h2>
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-medium">
                {([3, 6, 12] as TrendRange[]).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => {
                      setTrendRange(range);
                      setSelectedTrendIndex(null);
                    }}
                    className={`cursor-pointer rounded-full px-2.5 py-1 transition-colors ${
                      trendRange === range
                        ? 'bg-[#7C3AED] px-3 text-white'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {range === 3 ? '3 Bulan Terakhir' : `${range} Bulan`}
                  </button>
                ))}
              </div>
            </div>

            {visibleTrends.length ? (
              <div className="relative pt-2">
                <div className="flex">
                  {/* Y-axis Labels */}
                  <div className="flex h-44 flex-col justify-between pr-3 text-right text-[10px] text-slate-400">
                    {yAxisTicks.map((tick) => (
                      <span key={tick}>{tick}</span>
                    ))}
                  </div>

                  {/* Chart Grid & Line */}
                  <div className="relative h-44 flex-1 border-b border-slate-200">
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {yAxisTicks.slice(0, -1).map((tick) => (
                        <div key={tick} className="w-full border-t border-slate-100" />
                      ))}
                      <div />
                    </div>
                    <svg className="absolute inset-0 h-full w-full overflow-visible text-[#7C3AED]" viewBox="0 0 400 175" preserveAspectRatio="none">
                      <polyline
                        points={trendPoints}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {trendCoords.map((pt, index) => {
                        const isSelected = selectedTrendIndex === index;
                        return (
                          <g
                            key={index}
                            onClick={() => setSelectedTrendIndex(isSelected ? null : index)}
                            className="cursor-pointer"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedTrendIndex(isSelected ? null : index);
                              }
                            }}
                          >
                            <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isSelected ? '6.5' : '4.5'}
                              fill="currentColor"
                              stroke="#FFFFFF"
                              strokeWidth={isSelected ? '2' : '0'}
                            />
                            <text
                              x={pt.x}
                              y={pt.y - 10}
                              textAnchor="middle"
                              className="fill-[#7C3AED] text-[11px] font-bold"
                            >
                              {pt.value}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* X-axis Labels */}
                <div className="mt-2 flex justify-between gap-1 pl-8 pr-2 text-[10px] text-slate-400">
                  {visibleTrends.map((item, index) => (
                    <button
                      key={item.periode}
                      type="button"
                      onClick={() => setSelectedTrendIndex(selectedTrendIndex === index ? null : index)}
                      className={`cursor-pointer truncate transition-colors ${
                        selectedTrendIndex === index ? 'font-semibold text-[#7C3AED]' : 'hover:text-slate-600'
                      }`}
                    >
                      {monthLabel(item.periode)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-slate-500">{isLoading ? 'Memuat tren...' : 'Belum ada data pelayanan.'}</p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-1.5 text-[10px] text-slate-400">
            {selectedTrendIndex !== null && visibleTrends[selectedTrendIndex] ? (
              <span className="font-medium text-[#7C3AED]">
                {monthLabel(visibleTrends[selectedTrendIndex].periode)}: {visibleTrends[selectedTrendIndex].jumlahPelayanan} pelayanan
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-purple-100 text-[9px] font-bold text-purple-600">i</span>
                Tren jumlah pelayanan ini tercatat otomatis setelah kader menginput hasil pelayanan
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Riwayat Pelayanan */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="mb-3 text-lg font-bold text-slate-950">Riwayat Pelayanan</h2>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex w-full max-w-md items-center gap-2 rounded-lg border border-slate-500 bg-white px-3 py-2 text-slate-800 focus-within:border-purple-600 focus-within:ring-1 focus-within:ring-purple-600">
            <Search size={18} className="text-slate-900" />
            <input
              type="search"
              placeholder="Cari nama peserta ..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="w-full border-0 bg-transparent text-center text-xs text-slate-800 placeholder:text-slate-500 focus:outline-none md:text-sm"
            />
          </label>
          <div className="relative w-full max-w-[230px]">
            <select
              value={kategori}
              onChange={(event) => {
                setKategori(event.target.value as Category | '');
                setPage(1);
              }}
              className="w-full appearance-none rounded-lg border border-slate-500 bg-white px-3.5 py-2 pr-9 text-xs font-medium text-slate-800 focus:border-purple-600 focus:outline-none md:text-sm"
            >
              <option value="">Semua Kategori</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {displayCategory(category)}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-800" />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="min-w-full border-collapse text-center text-sm">
            <thead>
              <tr className="bg-[#9333EA] text-white">
                <th className="w-14 border-r border-slate-700 px-3 py-2.5 font-medium">No</th>
                <th className="border-r border-slate-700 px-4 py-2.5 font-medium">Nama Peserta/ NIK</th>
                <th className="border-r border-slate-700 px-4 py-2.5 font-medium">Kategori</th>
                <th className="border-r border-slate-700 px-4 py-2.5 font-medium">Tanggal</th>
                <th className="px-4 py-2.5 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white text-slate-900">
              {history.map((item, index) => (
                <tr key={item.id} className="border-t border-slate-700 hover:bg-slate-50">
                  <td className="border-r border-slate-700 px-3 py-2.5">{(page - 1) * 10 + index + 1}</td>
                  <td className="border-r border-slate-700 px-4 py-2.5">
                    <span className="block font-medium text-slate-900">{item.peserta.nama}</span>
                    <span className="block text-xs text-slate-700">{item.peserta.nik}</span>
                  </td>
                  <td className="border-r border-slate-700 px-4 py-2.5">{displayCategory(item.peserta.kategori)}</td>
                  <td className="border-r border-slate-700 px-4 py-2.5">{dateLabel(item.tanggalPemeriksaan)}</td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/hasil-pemeriksaan/${item.id}?pesertaId=${encodeURIComponent(item.pesertaId)}&jadwalId=${encodeURIComponent(item.jadwalId)}&examId=${encodeURIComponent(item.id)}`}
                      onClick={() => handleOpenDetail(item)}
                      title={item.jadwal.lokasi}
                      className="inline-block min-w-[110px] rounded-md bg-slate-200/80 px-4 py-1 text-xs font-medium text-slate-800 hover:bg-slate-300/80"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
              {!history.length && (
                <tr className="border-t border-slate-700">
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    {isLoading ? 'Memuat riwayat...' : 'Data pemeriksaan tidak ditemukan.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <span className="italic">
            Menampilkan {history.length} dari {historyTotal} data
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(historyPages, 5) }, (_, idx) => idx + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                disabled={isLoading}
                onClick={() => setPage(pageNum)}
                className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                  page === pageNum
                    ? 'bg-[#7C3AED] text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= historyPages || isLoading}
              onClick={() => setPage((value) => Math.min(historyPages, value + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  percent,
  subtitle,
}: {
  title: string;
  value?: number;
  percent?: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-[#8E3CCB] bg-white px-5 py-6 text-center shadow-xs">
      <p className="text-base font-bold text-[#8E3CCB]">{title}</p>
      <div className="mt-2 flex items-baseline justify-center gap-2">
        <h3 className="text-4xl font-extrabold tracking-tight text-[#8E3CCB]">{value ?? '—'}</h3>
        {percent && <span className="text-xs font-semibold text-emerald-500">{percent}</span>}
      </div>
      <p className="mt-1.5 text-xs font-medium text-slate-800">{subtitle}</p>
    </div>
  );
}