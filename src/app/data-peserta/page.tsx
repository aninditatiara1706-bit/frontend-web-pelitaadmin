'use client';

import { useEffect, useState } from 'react';
import { apiRequest, Category, displayCategory, Participant } from '../../lib/api';

type ParticipantPage = {
  data: Participant[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
};

const categories: Array<{ label: string; value: Category | '' }> = [
  { label: 'Semua', value: '' },
  { label: 'Balita', value: 'BALITA' },
  { label: 'Ibu Hamil', value: 'IBU_HAMIL' },
  { label: 'Lansia', value: 'LANSIA' },
];

export default function DataPesertaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage('');
      const query = new URLSearchParams({ page: String(page), limit: '10' });
      if (searchTerm.trim()) query.set('q', searchTerm.trim());
      if (selectedCategory) query.set('kategori', selectedCategory);

      try {
        const response = await apiRequest<Participant[]>(`/peserta?${query}`, {
          signal: controller.signal,
        });
        setParticipants(response.data);
        setTotal(response.meta?.total ?? response.data.length);
        setTotalPages(response.meta?.totalPages ?? 1);
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(error instanceof Error ? error.message : 'Gagal memuat peserta.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [page, searchTerm, selectedCategory]);

  const setCategory = (category: Category | '') => {
    setSelectedCategory(category);
    setPage(1);
  };

  return (
    <div className="w-full font-sans text-gray-800">
      <main className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Data Peserta</h1>
          <p className="mt-1 text-sm text-gray-500">Data peserta yang tersimpan di sistem Posyandu.</p>
        </header>

        <div className="mb-5 max-w-md">
          <label htmlFor="participant-search" className="sr-only">Cari nama atau NIK</label>
          <input
            id="participant-search"
            type="search"
            placeholder="Cari nama atau NIK..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {categories.map(({ label, value }) => (
            <button
              key={label}
              type="button"
              onClick={() => setCategory(value)}
              className={`rounded-xl px-5 py-2 text-sm font-bold shadow-sm transition ${
                selectedCategory === value
                  ? 'border border-purple-400 bg-purple-100 text-purple-900'
                  : 'bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] text-white hover:opacity-90'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {errorMessage && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <div className="overflow-x-auto rounded-2xl border border-gray-300 shadow-sm">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr className="bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] text-sm font-bold text-white">
                <th className="w-16 border-r border-purple-400/30 px-5 py-3.5 text-center">No</th>
                <th className="border-r border-purple-400/30 px-5 py-3.5">Nama</th>
                <th className="border-r border-purple-400/30 px-5 py-3.5">Kategori</th>
                <th className="border-r border-purple-400/30 px-5 py-3.5">Tanggal Lahir</th>
                <th className="px-5 py-3.5">No HP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm font-medium text-gray-800">
              {isLoading ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500">Memuat data peserta...</td></tr>
              ) : participants.length ? (
                participants.map((participant, index) => (
                  <tr key={participant.id} className="transition-colors hover:bg-purple-50/50">
                    <td className="border-r border-gray-200 px-5 py-4 text-center">{(page - 1) * 10 + index + 1}</td>
                    <td className="border-r border-gray-200 px-5 py-4">
                      <div className="font-semibold">{participant.nama}</div>
                      <div className="mt-0.5 text-xs text-gray-500">NIK {participant.nik}</div>
                    </td>
                    <td className="border-r border-gray-200 px-5 py-4">{displayCategory(participant.kategori)}</td>
                    <td className="border-r border-gray-200 px-5 py-4">
                      {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(`${participant.tanggalLahir.slice(0, 10)}T00:00:00`))}
                    </td>
                    <td className="px-5 py-4">{participant.noTelepon || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500">Data peserta tidak ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Menampilkan {participants.length} dari {total} peserta</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-gray-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span>Halaman {page} dari {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-lg border border-gray-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
