'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, Participant, QueueRecord, Schedule, displayCategory } from '../../lib/api';

function statusLabel(status: QueueRecord['status']) {
  return status === 'DIPERIKSA' ? 'Dipanggil' : status === 'MENUNGGU' ? 'Menunggu' : status === 'SELESAI' ? 'Selesai' : 'Batal';
}

const statusTransitions: Record<QueueRecord['status'], QueueRecord['status'][]> = {
  MENUNGGU: ['DIPERIKSA', 'BATAL'],
  DIPERIKSA: ['SELESAI', 'BATAL'],
  SELESAI: [],
  BATAL: [],
};

function formatScheduleDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(value));
}

export default function PendaftaranAntreanPage() {
  const [queues, setQueues] = useState<QueueRecord[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<QueueRecord['status']>('MENUNGGU');
  const [newParticipantId, setNewParticipantId] = useState('');
  const [newScheduleId, setNewScheduleId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [queueResponse, participantResponse, scheduleResponse] = await Promise.all([
        apiRequest<QueueRecord[]>('/antrean?status=MENUNGGU,DIPERIKSA,SELESAI'),
        apiRequest<Participant[]>('/peserta?page=1&limit=100'),
        apiRequest<Schedule[]>('/jadwal'),
      ]);
      setQueues(queueResponse.data);
      setParticipants(participantResponse.data);
      setSchedules(scheduleResponse.data);
      setNewParticipantId((current) => current || participantResponse.data[0]?.id || '');
      setNewScheduleId((current) => current || scheduleResponse.data.find((item) => item.status !== 'SELESAI')?.id || '');
      setSelectedId((current) => current || queueResponse.data.find((item) => item.status === 'MENUNGGU')?.id || queueResponse.data[0]?.id || '');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal memuat antrean.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredQueues = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    return queues.filter((item) =>
      item.jadwalId === newScheduleId &&
      (!query ||
        item.peserta.nama.toLocaleLowerCase().includes(query) ||
        `a-${item.noAntrean}`.includes(query) ||
        String(item.noAntrean).includes(query)),
    );
  }, [queues, searchTerm, newScheduleId]);

  const activeQueues = queues.filter((item) => item.jadwalId === newScheduleId);
  const nextQueue = activeQueues.find((item) => item.status === 'MENUNGGU');
  const currentQueue = activeQueues.find((item) => item.status === 'DIPERIKSA');
  const selectedQueue = queues.find((item) => item.id === selectedId);
  const availableStatuses = selectedQueue ? statusTransitions[selectedQueue.status] : [];

  const updateStatus = async (id: string, status: QueueRecord['status']) => {
    setIsSaving(true);
    setErrorMessage('');
    try {
      await apiRequest<QueueRecord>(`/antrean/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice('Status antrean berhasil diperbarui.');
      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal mengubah status antrean.');
    } finally {
      setIsSaving(false);
    }
  };

  const registerQueue = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    try {
      await apiRequest<QueueRecord>('/antrean', {
        method: 'POST',
        body: JSON.stringify({ pesertaId: newParticipantId, jadwalId: newScheduleId }),
      });
      setNotice('Peserta berhasil didaftarkan ke antrean.');
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal mendaftarkan antrean.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-white p-4 text-gray-800 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pendaftaran & Antrean Peserta</h1>
        <p className="mt-1 text-sm text-gray-600">
          Jadwal aktif:           {schedules.find((item) => item.id === newScheduleId)?.lokasi ?? 'Pilih jadwal untuk melihat antrean'}
        </p>
      </header>

      {errorMessage && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}

      <form onSubmit={registerQueue} className="mb-6 grid gap-3 rounded-2xl border border-purple-100 bg-purple-50/50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs font-semibold text-gray-700">
          Peserta
          <select required value={newParticipantId} onChange={(event) => setNewParticipantId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal">
            <option value="" disabled>Pilih peserta</option>
            {participants.map((item) => <option key={item.id} value={item.id}>{item.nama} · {displayCategory(item.kategori)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-gray-700">
          Jadwal
          <select required value={newScheduleId} onChange={(event) => setNewScheduleId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal">
            <option value="" disabled>Pilih jadwal</option>
            {schedules.filter((item) => item.status !== 'SELESAI').map((item) => <option key={item.id} value={item.id}>{formatScheduleDate(item.tanggal)} · {item.lokasi}</option>)}
          </select>
        </label>
        <button type="submit" disabled={isSaving || !participants.length || !schedules.some((item) => item.id === newScheduleId)} className="rounded-xl bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">
          {isSaving ? 'Menyimpan...' : 'Daftarkan antrean'}
        </button>
      </form>

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] p-4 text-center text-white shadow-md">
          <div className="text-sm font-semibold opacity-90">Nomor Sedang Diperiksa</div>
          <div className="text-3xl font-extrabold">{currentQueue ? `A-${currentQueue.noAntrean}` : '—'}</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] p-4 text-center text-white shadow-md">
          <div className="text-sm font-semibold opacity-90">Berikutnya</div>
          <div className="text-3xl font-extrabold">{nextQueue ? `A-${nextQueue.noAntrean}` : '—'}</div>
        </div>
      </section>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cari nama / nomor antrean" className="w-full max-w-sm rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100" />
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadData()} disabled={isLoading} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50">Muat ulang</button>
          <button type="button" disabled={!queues.some((item) => item.status === 'MENUNGGU') || isSaving} onClick={() => nextQueue && void updateStatus(nextQueue.id, 'DIPERIKSA')} className="rounded-xl border-2 border-[#7E3AF2] px-4 py-2.5 text-sm font-bold text-[#7E3AF2] disabled:cursor-not-allowed disabled:opacity-50">
            Panggil {nextQueue ? `A-${nextQueue.noAntrean}` : ''}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-300 bg-white shadow-sm">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead><tr className="bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] font-semibold text-white"><th className="w-24 px-5 py-3 text-center">No</th><th className="px-5 py-3">Nama</th><th className="px-5 py-3">Jadwal</th><th className="px-5 py-3">Kategori</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-center">Aksi</th></tr></thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">Memuat antrean...</td></tr>
            ) : filteredQueues.length ? filteredQueues.map((item) => (
              <tr key={item.id} className="hover:bg-purple-50/40">
                <td className="px-5 py-3.5 text-center font-semibold">A-{item.noAntrean}</td>
                <td className="px-5 py-3.5 font-semibold text-gray-900">{item.peserta.nama}</td>
                <td className="px-5 py-3.5">{formatScheduleDate(item.jadwal.tanggal)}</td>
                <td className="px-5 py-3.5">{displayCategory(item.peserta.kategori)}</td>
                <td className="px-5 py-3.5"><span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-800' : item.status === 'DIPERIKSA' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-800'}`}>{statusLabel(item.status)}</span></td>
                <td className="px-5 py-3.5 text-center">
                  {item.status === 'SELESAI' ? (
                    <Link href={`/hasil-pemeriksaan/${item.id}`} className="font-bold text-emerald-700 hover:underline">Lihat</Link>
                  ) : item.status === 'DIPERIKSA' ? (
                    <Link href={`/pemeriksaan/${item.id}`} className="font-bold text-purple-700 hover:underline">Periksa</Link>
                  ) : (
                    <button type="button" onClick={() => { setSelectedId(item.id); setSelectedStatus(statusTransitions[item.status][0] ?? item.status); setIsModalOpen(true); }} className="font-semibold text-gray-700 hover:text-purple-700">Ubah status</button>
                  )}
                </td>
              </tr>
            )) : <tr><td colSpan={6} className="py-8 text-center text-gray-500">Belum ada data antrean pada sistem.</td></tr>}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Ubah Status Antrean</h2>
            <label className="block text-sm font-semibold text-gray-700">
              Status baru
              <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as QueueRecord['status'])} className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5">
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status === 'DIPERIKSA' ? 'Dipanggil / sedang diperiksa' : status === 'SELESAI' ? 'Selesai' : 'Batalkan antrean'}
                  </option>
                ))}
              </select>
            </label>
            {selectedQueue?.status === 'MENUNGGU' && (
              <p className="mt-3 text-sm text-gray-600">
                Antrean harus dipanggil dan pemeriksaan disimpan terlebih dahulu sebelum statusnya menjadi selesai.
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm">Batal</button>
              <button type="button" disabled={isSaving || !availableStatuses.includes(selectedStatus)} onClick={() => void updateStatus(selectedId, selectedStatus)} className="rounded-xl bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isSaving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
