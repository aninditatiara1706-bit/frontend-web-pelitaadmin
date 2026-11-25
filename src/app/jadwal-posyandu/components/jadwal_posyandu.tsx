'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest, QueueRecord, Schedule as ApiSchedule } from '../../../lib/api';

const MAX_QUOTA = 30;

interface Schedule {
  id: string;
  title: string;
  date: string;
  day: number;
  month: number;
  year: number;
  time: string;
  location: string;
  participants: number;
  status: ApiSchedule['status'];
}

function jakartaDateParts(value: Date | string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value) - 1,
    day: Number(parts.find((part) => part.type === 'day')?.value),
  };
}

function dateKey(year: number, month: number, day: number) {
  return year * 10000 + (month + 1) * 100 + day;
}

function todayKey() {
  const today = jakartaDateParts(new Date());
  return dateKey(today.year, today.month, today.day);
}

function mapSchedule(schedule: ApiSchedule): Schedule {
  const { day, month, year } = jakartaDateParts(schedule.tanggal);
  const description = schedule.deskripsi ?? '';
  const timeMatch = description.match(/\d{1,2}[.:]\d{2}\s*-\s*\d{1,2}[.:]\d{2}/);
  const title = timeMatch
    ? description.slice(0, timeMatch.index).replace(/[•·|]+/g, ' ').trim()
    : (description.split(/[•·|]/)[0] ?? '').replace(/PELITA_DEMO_[A-Z_]+/gi, '').trim();
  const time = timeMatch?.[0] ?? description.split(/[•·|]/).slice(1).join(' • ').trim();

  return {
    id: schedule.id,
    title: title || 'Jadwal Posyandu',
    date: schedule.tanggal,
    day,
    month,
    year,
    time: time || 'Waktu belum diatur',
    location: schedule.lokasi,
    participants: schedule._count?.antrean ?? 0,
    status: schedule.status,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const FULL_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function JadwalPosyanduPage() {
  const today = jakartaDateParts(new Date());
  const [currentMonth, setCurrentMonth] = useState(today.month);
  const [currentYear, setCurrentYear] = useState(today.year);
  const [selectedDay, setSelectedDay] = useState(today.day);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('Posyandu Melati');
  const [formTime, setFormTime] = useState('08.00 - 12.00');
  const [formLocation, setFormLocation] = useState('Balai Kelurahan');

  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [queues, setQueues] = useState<QueueRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [scheduleResponse, queueResponse] = await Promise.all([
        apiRequest<ApiSchedule[]>('/jadwal'),
        apiRequest<QueueRecord[]>('/antrean?status=MENUNGGU,DIPERIKSA,SELESAI,BATAL'),
      ]);
      setSchedules(scheduleResponse.data.map(mapSchedule));
      setQueues(queueResponse.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal memuat jadwal.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((year) => year - 1);
    } else setCurrentMonth((month) => month - 1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((year) => year + 1);
    } else setCurrentMonth((month) => month + 1);
  };

  const selectedDateKey = dateKey(currentYear, currentMonth, selectedDay);
  const isSelectedDatePast = selectedDateKey < todayKey();

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (isSelectedDatePast) {
      setErrorMessage('Tidak dapat membuat jadwal pada tanggal yang sudah lewat.');
      return;
    }

    const duplicate = schedules.some((schedule) =>
      schedule.day === selectedDay &&
      schedule.month === currentMonth &&
      schedule.year === currentYear &&
      schedule.title.trim().toLowerCase() === formTitle.trim().toLowerCase() &&
      schedule.time.trim().toLowerCase() === formTime.trim().toLowerCase() &&
      schedule.location.trim().toLowerCase() === formLocation.trim().toLowerCase(),
    );

    if (duplicate) {
      setErrorMessage('Jadwal dengan nama, waktu, dan lokasi yang sama sudah tersedia pada tanggal tersebut.');
      return;
    }

    setIsSaving(true);
    try {
      // Jam 08.00 UTC = 15.00 WIB, tanggal kalender tetap tanggal yang dipilih di WIB.
      const tanggal = new Date(Date.UTC(currentYear, currentMonth, selectedDay, 7)).toISOString();
      const response = await apiRequest<ApiSchedule>('/jadwal', {
        method: 'POST',
        body: JSON.stringify({
          tanggal,
          lokasi: formLocation.trim(),
          deskripsi: `${formTitle.trim()} • ${formTime.trim()}`,
        }),
      });

      const newSchedule = mapSchedule(response.data);
      setSchedules((prev) => [...prev, newSchedule]);
      setSelectedSchedule(null);
      setIsModalOpen(false);
      await loadSchedules();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal menyimpan jadwal.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    setErrorMessage('');
    try {
      await apiRequest<{ id: string }>(`/jadwal/${id}`, { method: 'DELETE' });
      setSchedules((prev) => prev.filter((item) => item.id !== id));
      setSelectedSchedule(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal menghapus jadwal.');
    }
  };

  const todaySchedules = schedules.filter((schedule) =>
    dateKey(schedule.year, schedule.month, schedule.day) === todayKey(),
  );

  const upcomingSchedules = schedules.filter((schedule) =>
    dateKey(schedule.year, schedule.month, schedule.day) > todayKey(),
  );

  const groupedSchedules = (items: Schedule[]) => {
    const groups = new Map<string, Schedule[]>();
    for (const item of items) {
      const key = [
        item.year, item.month, item.day,
        item.title.trim().toLowerCase(),
        item.time.trim().toLowerCase(),
        item.location.trim().toLowerCase(),
      ].join('|');
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }

    return Array.from(groups.values()).map((group) => {
      const ids = new Set(group.map((item) => item.id));
      // Antrean BATAL tidak mengurangi/menambah kuota peserta aktif.
      const activeQueues = queues.filter((queue) => ids.has(queue.jadwalId) && queue.status !== 'BATAL');
      const uniqueParticipants = new Set(activeQueues.map((queue) => queue.pesertaId));
      const preferred = [...group].sort((a, b) => {
        const rank = { BERJALAN: 0, MENDATANG: 1, SELESAI: 2 };
        return rank[a.status] - rank[b.status] || b.participants - a.participants;
      })[0];

      return {
        ...preferred,
        participants: uniqueParticipants.size,
      };
    });
  };

  const displayedTodaySchedules = groupedSchedules(todaySchedules);
  const displayedUpcomingSchedules = groupedSchedules(upcomingSchedules);

  const calendarCells: { day: number; isCurrentMonth: boolean }[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) calendarCells.push({ day: prevMonthDays - i, isCurrentMonth: false });
  for (let day = 1; day <= daysInMonth; day++) calendarCells.push({ day, isCurrentMonth: true });
  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let day = 1; day <= remaining; day++) calendarCells.push({ day, isCurrentMonth: false });

  const quotaLabel = (participants: number) => `${participants}/${MAX_QUOTA}`;
  const quotaPercent = (participants: number) => Math.min(100, Math.max(0, (participants / MAX_QUOTA) * 100));
  const isFull = (participants: number) => participants >= MAX_QUOTA;

  const renderQuota = (participants: number) => (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm font-semibold ${isFull(participants) ? 'text-red-600' : 'text-purple-700'}`}>
          Kuota: {quotaLabel(participants)} peserta {isFull(participants) ? '(PENUH)' : ''}
        </p>
        <p className="text-xs text-gray-500">{Math.max(0, MAX_QUOTA - participants)} tersisa</p>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${isFull(participants) ? 'bg-red-500' : 'bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA]'}`}
          style={{ width: `${quotaPercent(participants)}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-white p-6 md:p-10 font-sans text-gray-800">
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Jadwal Posyandu</h1>
        <button
          onClick={() => {
            if (isSelectedDatePast) {
              setErrorMessage('Pilih tanggal hari ini atau tanggal mendatang untuk membuat jadwal.');
              return;
            }
            setErrorMessage('');
            setIsModalOpen(true);
          }}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
        >
          <span className="text-lg font-bold leading-none">+</span>
          <span>Tambah Jadwal</span>
        </button>
      </div>

      <div className="mx-auto max-w-5xl">
        {errorMessage && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}
        {isLoading && <p role="status" className="mb-4 text-sm text-gray-500">Memuat jadwal...</p>}

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-4">
            <div className="mb-4 flex items-center justify-between px-1">
              <button onClick={handlePrevMonth} className="cursor-pointer p-1 text-gray-600 transition hover:text-purple-600" aria-label="Bulan sebelumnya">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                <select value={currentMonth} onChange={(e) => setCurrentMonth(Number(e.target.value))} className="cursor-pointer rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400">
                  {MONTHS.map((month, index) => <option key={month} value={index}>{month}</option>)}
                </select>
                <select value={currentYear} onChange={(e) => setCurrentYear(Number(e.target.value))} className="cursor-pointer rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400">
                  {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              <button onClick={handleNextMonth} className="cursor-pointer p-1 text-gray-600 transition hover:text-purple-600" aria-label="Bulan berikutnya">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-semibold text-gray-400">
              {DAYS_OF_WEEK.map((day) => <div key={day} className="py-1">{day}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
              {calendarCells.map((cell, index) => {
                const key = dateKey(currentYear, currentMonth, cell.day);
                const selected = cell.isCurrentMonth && selectedDay === cell.day;
                const past = cell.isCurrentMonth && key < todayKey();
                const hasSchedule = cell.isCurrentMonth && schedules.some((s) => s.day === cell.day && s.month === currentMonth && s.year === currentYear);
                return (
                  <div key={index} className="flex items-center justify-center py-1">
                    {cell.isCurrentMonth ? (
                      <button
                        type="button"
                        disabled={past}
                        onClick={() => { setSelectedDay(cell.day); setErrorMessage(''); }}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition ${
                          past ? 'cursor-not-allowed text-gray-300 line-through' :
                          selected ? 'bg-purple-100 font-bold text-purple-700 shadow-sm' :
                          hasSchedule ? 'bg-[#7E3AF2] font-bold text-white shadow-sm' :
                          'cursor-pointer text-gray-700 hover:bg-purple-50'
                        }`}
                        title={past ? 'Tanggal sudah lewat' : undefined}
                      >{cell.day}</button>
                    ) : <span className="flex h-7 w-7 items-center justify-center text-gray-300">{cell.day}</span>}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-center text-[11px] text-gray-400">Tanggal yang sudah lewat tidak dapat dipilih untuk membuat jadwal.</p>
          </div>

          <div className="space-y-6 lg:col-span-8">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] px-5 py-2.5 text-sm font-semibold text-white">Jadwal Hari Ini</div>
              {displayedTodaySchedules.length > 0 ? displayedTodaySchedules.map((schedule) => (
                <div key={schedule.id} className="flex items-start gap-4 p-5">
                  <div className="pt-0.5 text-[#7E3AF2]">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-base font-semibold text-gray-900">{schedule.title}</h3>
                    <p className="text-sm font-medium text-gray-700">{schedule.time}</p>
                    <p className="text-sm text-gray-600">{schedule.location}</p>
                    {renderQuota(schedule.participants)}
                    <div className="pt-2">
                      <button onClick={() => setSelectedSchedule(schedule)} className="cursor-pointer rounded-xl bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:opacity-90 active:scale-95">Lihat Detail</button>
                    </div>
                  </div>
                </div>
              )) : <div className="p-6 text-sm text-gray-400">Tidak ada jadwal untuk hari ini.</div>}
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] px-5 py-2.5 text-sm font-semibold text-white">Jadwal Mendatang</div>
              {displayedUpcomingSchedules.length > 0 ? displayedUpcomingSchedules.map((schedule) => (
                <div key={schedule.id} className="flex items-start gap-6 p-5">
                  <div className="min-w-[24px] pt-0.5 text-lg font-bold text-gray-800">{schedule.day}</div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-base font-bold text-gray-900">{FULL_MONTHS[schedule.month]} {schedule.year}</h3>
                    <p className="text-base font-semibold text-gray-800">{schedule.title}</p>
                    <p className="text-sm font-medium text-gray-700">{schedule.time}</p>
                    <p className="text-sm text-gray-600">{schedule.location}</p>
                    {renderQuota(schedule.participants)}
                    <div className="pt-2">
                      <button onClick={() => setSelectedSchedule(schedule)} className="cursor-pointer rounded-xl bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:opacity-90 active:scale-95">Lihat Detail</button>
                    </div>
                  </div>
                </div>
              )) : <div className="p-6 text-sm text-gray-400">Belum ada jadwal mendatang.</div>}
            </div>
          </div>
        </div>
      </div>

      {selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Detail Jadwal Posyandu</h2>
              <button onClick={() => setSelectedSchedule(null)} className="cursor-pointer p-1 text-xl font-bold text-gray-400 hover:text-gray-600" aria-label="Tutup">✕</button>
            </div>
            <div className="space-y-4 text-sm text-gray-800">
              <div className="space-y-1 rounded-xl border border-purple-100 bg-purple-50 p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">Nama Posyandu</span>
                <p className="text-lg font-bold text-gray-900">{selectedSchedule.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 p-3">
                  <span className="mb-1 block text-xs font-medium text-gray-500">Tanggal</span>
                  <p className="font-semibold text-gray-800">{selectedSchedule.day} {FULL_MONTHS[selectedSchedule.month]} {selectedSchedule.year}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-3">
                  <span className="mb-1 block text-xs font-medium text-gray-500">Waktu</span>
                  <p className="font-semibold text-gray-800">{selectedSchedule.time}</p>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <span className="mb-1 block text-xs font-medium text-gray-500">Lokasi</span>
                <p className="font-semibold text-gray-800">{selectedSchedule.location}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <span className="mb-1 block text-xs font-medium text-gray-500">Kuota Peserta</span>
                <p className="font-semibold text-gray-800">{selectedSchedule.participants}/{MAX_QUOTA} Orang</p>
                {renderQuota(selectedSchedule.participants)}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
              <button onClick={() => handleDeleteSchedule(selectedSchedule.id)} className="cursor-pointer rounded-lg px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-50 hover:text-red-700">Hapus Jadwal</button>
              <button onClick={() => setSelectedSchedule(null)} className="cursor-pointer rounded-xl bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Tambah Jadwal Posyandu</h2>
            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50 p-3 text-xs font-semibold text-purple-800">
                <span>Tanggal Terpilih:</span>
                <span className="text-sm font-bold">{selectedDay} {FULL_MONTHS[currentMonth]} {currentYear}</span>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Nama Posyandu</label>
                <input type="text" required value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Contoh: Posyandu Melati" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Waktu Pelaksanaan</label>
                <input type="text" required value={formTime} onChange={(e) => setFormTime(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Contoh: 08.00 - 12.00" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Lokasi</label>
                <input type="text" required value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Contoh: Balai Kelurahan" />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="cursor-pointer rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">Batal</button>
                <button type="submit" disabled={isSaving || isSelectedDatePast} className="cursor-pointer rounded-xl bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Menyimpan...' : 'Simpan Jadwal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
