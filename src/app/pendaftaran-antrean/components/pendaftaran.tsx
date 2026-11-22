'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiRequest,
  Participant,
  QueueRecord,
  Schedule,
  displayCategory,
} from '../../../lib/api';

function statusLabel(status: QueueRecord['status']) {
  return status === 'DIPERIKSA'
    ? 'Dipanggil'
    : status === 'MENUNGGU'
      ? 'Menunggu'
      : status === 'SELESAI'
        ? 'Selesai'
        : 'Batal';
}

const statusTransitions: Record<
  QueueRecord['status'],
  QueueRecord['status'][]
> = {
  MENUNGGU: ['DIPERIKSA', 'BATAL'],
  DIPERIKSA: ['SELESAI', 'BATAL'],
  SELESAI: [],
  BATAL: [],
};

function formatScheduleDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
  }).format(new Date(value));
}

export default function PendaftaranAntreanPage() {
  const [queues, setQueues] = useState<QueueRecord[]>([]);
  const [, setParticipants] = useState<Participant[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [selectedStatus, setSelectedStatus] =
    useState<QueueRecord['status']>('MENUNGGU');

  const [newScheduleId, setNewScheduleId] = useState('');

  // FORM PESERTA BARU
  const [nik, setNik] = useState('');
  const [nama, setNama] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<
    'LAKI_LAKI' | 'PEREMPUAN'
  >('LAKI_LAKI');
  const [kategori, setKategori] = useState<
    'BALITA' | 'IBU_HAMIL' | 'LANSIA'
  >('BALITA');
  const [alamat, setAlamat] = useState('');
  const [noTelepon, setNoTelepon] = useState('');

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  // ==========================================
  // LOAD DATA
  // ==========================================

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [
        queueResponse,
        participantResponse,
        scheduleResponse,
      ] = await Promise.all([
        apiRequest<QueueRecord[]>(
          '/antrean?status=MENUNGGU,DIPERIKSA,SELESAI'
        ),
        apiRequest<Participant[]>('/peserta?page=1&limit=100'),
        apiRequest<Schedule[]>('/jadwal'),
      ]);

      setQueues(queueResponse.data);
      setParticipants(participantResponse.data);
      setSchedules(scheduleResponse.data);

      setNewScheduleId((current) => {
        if (
          current &&
          scheduleResponse.data.some((item) => item.id === current)
        ) {
          return current;
        }

        return (
          scheduleResponse.data.find(
            (item) => item.status !== 'SELESAI'
          )?.id || ''
        );
      });

      setSelectedId((current) => {
        if (
          current &&
          queueResponse.data.some((item) => item.id === current)
        ) {
          return current;
        }

        return (
          queueResponse.data.find(
            (item) => item.status === 'MENUNGGU'
          )?.id ||
          queueResponse.data[0]?.id ||
          ''
        );
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Gagal memuat antrean.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ==========================================
  // SIMPAN CACHE DETAIL HASIL PEMERIKSAAN
  // ==========================================

  const cacheQueueResult = (item: QueueRecord) => {
    if (typeof window === 'undefined') return;
    const rawItem = item as unknown as Record<string, unknown>;
    const examObj = (rawItem.pemeriksaan ?? rawItem.examination ?? rawItem) as Record<string, unknown>;
    const payload = JSON.stringify({
      queue: {
        ...item,
        tanggal: item.tanggal ?? new Date().toISOString(),
      },
      examination: examObj,
    });
    window.sessionStorage.setItem(`hasil-pemeriksaan:${item.id}`, payload);
    if (item.pesertaId && item.jadwalId) {
      window.sessionStorage.setItem(
        `hasil-pemeriksaan:${item.pesertaId}:${item.jadwalId}`,
        payload,
      );
    }
  };

  // ==========================================
  // FILTER ANTREAN
  // ==========================================

  const filteredQueues = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();

    return queues.filter((item) => {
      return (
        item.jadwalId === newScheduleId &&
        (!query ||
          item.peserta.nama.toLocaleLowerCase().includes(query) ||
          `a-${item.noAntrean}`.toLowerCase().includes(query) ||
          String(item.noAntrean).includes(query))
      );
    });
  }, [queues, searchTerm, newScheduleId]);

  // ==========================================
  // DATA ANTREAN
  // ==========================================

  const activeQueues = queues.filter(
    (item) => item.jadwalId === newScheduleId
  );

  const nextQueue = activeQueues.find(
    (item) => item.status === 'MENUNGGU'
  );

  const calledQueues = activeQueues.filter(
    (item) => item.status === 'DIPERIKSA'
  );

  const currentQueue = calledQueues[0];

  const selectedQueue = queues.find(
    (item) => item.id === selectedId
  );

  const availableStatuses = selectedQueue
    ? statusTransitions[selectedQueue.status]
    : [];

  const activeSchedule = schedules.find(
    (item) => item.id === newScheduleId
  );

  // ==========================================
  // UPDATE STATUS
  // ==========================================

  const updateStatus = async (
    id: string,
    status: QueueRecord['status']
  ) => {
    setIsSaving(true);
    setErrorMessage('');
    setNotice('');

    try {
      await apiRequest<QueueRecord>(`/antrean/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setNotice('Status antrean berhasil diperbarui.');
      setIsStatusModalOpen(false);

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Gagal mengubah status antrean.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // RESET FORM PENDAFTARAN
  // ==========================================

  const resetRegisterForm = () => {
    setNik('');
    setNama('');
    setTanggalLahir('');
    setJenisKelamin('LAKI_LAKI');
    setKategori('BALITA');
    setAlamat('');
    setNoTelepon('');
  };

  // ==========================================
  // REGISTER PESERTA BARU + ANTREAN
  // ==========================================

  const registerQueue = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!newScheduleId) {
      setErrorMessage('Silakan pilih jadwal terlebih dahulu.');
      return;
    }

    if (!/^\d{16}$/.test(nik)) {
      setErrorMessage('NIK harus terdiri dari 16 digit angka.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setNotice('');

    try {
      const participantResponse = await apiRequest<Participant>(
        '/peserta',
        {
          method: 'POST',
          body: JSON.stringify({
            nik,
            nama,
            tanggalLahir,
            jenisKelamin,
            kategori,
            alamat,
            noTelepon,
          }),
        }
      );

      const createdParticipant = participantResponse.data;

      await apiRequest<QueueRecord>('/antrean', {
        method: 'POST',
        body: JSON.stringify({
          pesertaId: createdParticipant.id,
          jadwalId: newScheduleId,
        }),
      });

      setNotice(
        'Peserta baru berhasil didaftarkan dan masuk ke antrean.'
      );

      setIsRegisterModalOpen(false);
      resetRegisterForm();

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Gagal mendaftarkan peserta baru.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // OPEN STATUS MODAL
  // ==========================================

  const openStatusModal = () => {
    if (!selectedQueue || availableStatuses.length === 0) {
      return;
    }

    setSelectedStatus(availableStatuses[0]);
    setIsStatusModalOpen(true);
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <main className="min-h-screen bg-white p-4 text-gray-800 sm:p-6">
      {/* HEADER */}
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            Pendaftaran &amp; Antrean Peserta
          </h1>

          <p className="mt-1 text-xs text-gray-600">
            Jadwal:{' '}
            {activeSchedule
              ? `${formatScheduleDate(activeSchedule.tanggal)} - ${activeSchedule.lokasi}`
              : 'Pilih jadwal untuk melihat antrean'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMessage('');
            setIsRegisterModalOpen(true);
          }}
          className="rounded-md border border-[#A348CF] px-3 py-1.5 text-xs font-semibold text-[#9843C5] transition hover:bg-purple-50"
        >
          + Pendaftaran
        </button>
      </header>

      {/* ALERT */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700"
        >
          {notice}
        </div>
      )}

      {/* NOMOR ANTREAN DAN SEARCH */}
      <section className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex h-[76px] w-[132px] flex-col items-center justify-center rounded-lg bg-gradient-to-r from-[#9144C5] to-[#CB55D5] text-white">
            <span className="text-xs font-semibold">
              Nomor Sekarang
            </span>

            <span className="text-[30px] font-extrabold leading-tight">
              {currentQueue
                ? `A-${String(currentQueue.noAntrean).padStart(2, '0')}`
                : '—'}
            </span>
          </div>

          <div className="flex h-[76px] w-[132px] flex-col items-center justify-center rounded-lg bg-gradient-to-r from-[#9144C5] to-[#CB55D5] text-white">
            <span className="text-xs font-semibold">
              Berikutnya
            </span>

            <span className="text-[30px] font-extrabold leading-tight">
              {nextQueue
                ? `A-${String(nextQueue.noAntrean).padStart(2, '0')}`
                : '—'}
            </span>
          </div>
        </div>

        <div className="flex flex-1">
          <div className="relative w-full sm:ml-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </span>

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Cari Nama Peserta"
              className="h-[36px] w-full rounded-md border border-gray-400 bg-white pl-9 pr-3 text-xs outline-none transition focus:border-[#A348CF] focus:ring-1 focus:ring-purple-200"
            />
          </div>
        </div>
      </section>

      {/* WARNING ANTREAN */}
      {calledQueues.length > 1 && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
        >
          Ada lebih dari satu antrean yang berstatus Dipanggil.
          Selesaikan pemeriksaan yang sedang berjalan sebelum
          memanggil antrean berikutnya.
        </p>
      )}

      {/* TABEL ANTREAN */}
      <section className="overflow-hidden rounded-lg border border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[550px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#9144C5] to-[#CB55D5] text-white">
                <th className="w-[9%] px-3 py-2 font-bold text-center">
                  No
                </th>
                <th className="w-[19%] px-3 py-2 font-bold">
                  Nama
                </th>
                <th className="w-[20%] px-3 py-2 font-bold">
                  Kategori
                </th>
                <th className="w-[29%] px-3 py-2 font-bold">
                  Status
                </th>
                <th className="w-[23%] px-3 py-2 font-bold">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-7 text-center text-gray-500"
                  >
                    Memuat antrean...
                  </td>
                </tr>
              ) : filteredQueues.length > 0 ? (
                filteredQueues.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`cursor-pointer transition ${
                      selectedId === item.id
                        ? 'bg-purple-50'
                        : 'bg-white hover:bg-purple-50/40'
                    }`}
                  >
                    <td className="border-r border-gray-200 px-3 py-2.5 text-center">
                      A-{String(item.noAntrean).padStart(2, '0')}
                    </td>

                    <td className="border-r border-gray-200 px-3 py-2.5 font-medium text-gray-900">
                      {item.peserta.nama}
                    </td>

                    <td className="border-r border-gray-200 px-3 py-2.5">
                      {displayCategory(item.peserta.kategori)}
                    </td>

                    <td className="border-r border-gray-200 px-3 py-2.5">
                      <span
                        className={`font-medium ${
                          item.status === 'SELESAI'
                            ? 'text-green-700'
                            : item.status === 'DIPERIKSA'
                              ? 'text-purple-700'
                              : item.status === 'BATAL'
                                ? 'text-red-600'
                                : 'text-gray-800'
                        }`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </td>

                    <td className="px-3 py-2.5">
                      {item.status === 'SELESAI' ? (
                        <Link
                          href={`/hasil-pemeriksaan/${item.id}?pesertaId=${encodeURIComponent(item.pesertaId)}&jadwalId=${encodeURIComponent(item.jadwalId)}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            cacheQueueResult(item);
                          }}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          Lihat Hasil
                        </Link>
                      ) : item.status === 'DIPERIKSA' ? (
                        <Link
                          href={`/pemeriksaan/${item.id}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            cacheQueueResult(item);
                          }}
                          className="font-medium text-purple-700 hover:underline"
                        >
                          Periksa
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(item.id);
                          }}
                          className="font-medium text-gray-800 hover:text-purple-700"
                        >
                          Pilih
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-7 text-center text-gray-500"
                  >
                    Belum ada data antrean pada sistem.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* TOMBOL AKSI */}
      <section className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={
            !nextQueue ||
            Boolean(currentQueue) ||
            isSaving
          }
          onClick={() => {
            if (nextQueue) {
              setSelectedId(nextQueue.id);
              void updateStatus(nextQueue.id, 'DIPERIKSA');
            }
          }}
          className="min-w-[150px] rounded-md border border-[#A348CF] bg-white px-5 py-2.5 text-sm font-bold text-gray-900 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {currentQueue
            ? `Sedang periksa A-${String(currentQueue.noAntrean).padStart(2, '0')}`
            : nextQueue
              ? `Panggil A-${String(nextQueue.noAntrean).padStart(2, '0')}`
              : 'Tidak ada antrean'}
        </button>

        <button
          type="button"
          disabled={
            !selectedQueue ||
            availableStatuses.length === 0 ||
            isSaving
          }
          onClick={openStatusModal}
          className="min-w-[150px] rounded-md bg-gradient-to-r from-[#9144C5] to-[#CB55D5] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Ubah Status
        </button>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={isLoading}
          className="rounded-md border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
        >
          Muat Ulang
        </button>
      </section>

      {/* ==========================================
          MODAL PENDAFTARAN PESERTA BARU
      ========================================== */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <section className="my-auto w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Pendaftaran Peserta Baru
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Lengkapi data peserta untuk mendaftarkan antrean.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsRegisterModalOpen(false);
                  resetRegisterForm();
                }}
                className="text-xl text-gray-500 hover:text-gray-900"
              >
                &times;
              </button>
            </div>

            <form onSubmit={registerQueue} className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700">
                NIK
                <input
                  type="text"
                  required
                  maxLength={16}
                  minLength={16}
                  inputMode="numeric"
                  pattern="[0-9]{16}"
                  value={nik}
                  onChange={(event) =>
                    setNik(event.target.value.replace(/\D/g, '').slice(0, 16))
                  }
                  placeholder="Masukkan 16 digit NIK"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-purple-500"
                />
              </label>

              <label className="block text-xs font-semibold text-gray-700">
                Nama Lengkap
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(event) => setNama(event.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-purple-500"
                />
              </label>

              <label className="block text-xs font-semibold text-gray-700">
                Tanggal Lahir
                <input
                  type="date"
                  required
                  value={tanggalLahir}
                  onChange={(event) =>
                    setTanggalLahir(event.target.value)
                  }
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-purple-500"
                />
              </label>

              <label className="block text-xs font-semibold text-gray-700">
                Jenis Kelamin
                <select
                  required
                  value={jenisKelamin}
                  onChange={(event) =>
                    setJenisKelamin(
                      event.target.value as 'LAKI_LAKI' | 'PEREMPUAN'
                    )
                  }
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-purple-500"
                >
                  <option value="LAKI_LAKI">Laki-laki</option>
                  <option value="PEREMPUAN">Perempuan</option>
                </select>
              </label>

              <label className="block text-xs font-semibold text-gray-700">
                Kategori Peserta
                <select
                  required
                  value={kategori}
                  onChange={(event) =>
                    setKategori(
                      event.target.value as
                        | 'BALITA'
                        | 'IBU_HAMIL'
                        | 'LANSIA'
                    )
                  }
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-purple-500"
                >
                  <option value="BALITA">Balita</option>
                  <option value="IBU_HAMIL">Ibu Hamil</option>
                  <option value="LANSIA">Lansia</option>
                </select>
              </label>

              <label className="block text-xs font-semibold text-gray-700">
                Alamat
                <textarea
                  required
                  value={alamat}
                  onChange={(event) => setAlamat(event.target.value)}
                  placeholder="Masukkan alamat lengkap"
                  rows={2}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-purple-500"
                />
              </label>

              <label className="block text-xs font-semibold text-gray-700">
                Nomor HP / Telepon
                <input
                  type="tel"
                  required
                  value={noTelepon}
                  onChange={(event) => setNoTelepon(event.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-purple-500"
                />
              </label>

              <label className="block text-xs font-semibold text-gray-700">
                Jadwal Pelayanan
                <select
                  required
                  value={newScheduleId}
                  onChange={(event) =>
                    setNewScheduleId(event.target.value)
                  }
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-purple-500"
                >
                  <option value="" disabled>
                    Pilih jadwal pelayanan
                  </option>

                  {schedules
                    .filter((item) => item.status !== 'SELESAI')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {formatScheduleDate(item.tanggal)} · {item.lokasi}
                      </option>
                    ))}
                </select>
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterModalOpen(false);
                    resetRegisterForm();
                  }}
                  disabled={isSaving}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-700"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSaving || !newScheduleId}
                  className="rounded-lg bg-gradient-to-r from-[#9144C5] to-[#CB55D5] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : 'Daftarkan Peserta'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ==========================================
          MODAL UBAH STATUS
      ========================================== */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <h2 className="mb-4 text-base font-bold text-gray-900">
              Ubah Status Antrean
            </h2>

            {selectedQueue && (
              <div className="mb-4 rounded-lg bg-purple-50 p-3">
                <p className="text-xs text-gray-500">
                  Peserta
                </p>

                <p className="text-sm font-bold text-gray-900">
                  {selectedQueue.peserta.nama}
                </p>

                <p className="mt-1 text-xs text-purple-700">
                  Nomor Antrean: A-
                  {String(selectedQueue.noAntrean).padStart(2, '0')}
                </p>
              </div>
            )}

            <label className="block text-xs font-semibold text-gray-700">
              Status Baru
              <select
                value={selectedStatus}
                onChange={(event) =>
                  setSelectedStatus(
                    event.target.value as QueueRecord['status']
                  )
                }
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-purple-500"
              >
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status === 'DIPERIKSA'
                      ? 'Dipanggil / Sedang Diperiksa'
                      : status === 'SELESAI'
                        ? 'Selesai'
                        : 'Batalkan Antrean'}
                  </option>
                ))}
              </select>
            </label>

            {selectedQueue?.status === 'MENUNGGU' && (
              <p className="mt-3 text-xs text-gray-500">
                Antrean harus dipanggil dan pemeriksaan disimpan
                terlebih dahulu sebelum statusnya menjadi selesai.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={
                  isSaving ||
                  !availableStatuses.includes(selectedStatus)
                }
                onClick={() => {
                  if (selectedId) {
                    void updateStatus(selectedId, selectedStatus);
                  }
                }}
                className="rounded-lg bg-gradient-to-r from-[#9144C5] to-[#CB55D5] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}