'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest, QueueRecord, Schedule as ApiSchedule } from '../../lib/api';

interface Schedule {
  id: string;
  title: string;
  date: string;
  day: number;
  month: number; // 0-11
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

function mapSchedule(schedule: ApiSchedule): Schedule {
  const { day, month, year } = jakartaDateParts(schedule.tanggal);
  const description = schedule.deskripsi ?? '';
  const timeMatch = description.match(/\d{1,2}[.:]\d{2}\s*-\s*\d{1,2}[.:]\d{2}/);
  const [fallbackTitle, fallbackTime] = description.split(/\s*[•·|?]\s*/, 2);
  const title = timeMatch
    ? description.slice(0, timeMatch.index).replace(/[^\p{L}\p{N}\s]+/gu, ' ').trim()
    : fallbackTitle?.replace(/PELITA_DEMO_[A-Z_]+/gi, '').trim();
  const time = timeMatch?.[0] ?? fallbackTime;
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

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const FULL_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const YEARS = [2024, 2025, 2026, 2027, 2028];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function JadwalPosyanduPage() {

  const today = new Date();
  const { day: realDay, month: realMonth, year: realYear } = jakartaDateParts(today);

  const [currentMonth, setCurrentMonth] = useState<number>(realMonth);
  const [currentYear, setCurrentYear] = useState<number>(realYear);
  const [selectedDay, setSelectedDay] = useState<number>(realDay);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('Posyandu Melati');
  const [formTime, setFormTime] = useState('08.00 - 12.00');
  const [formLocation, setFormLocation] = useState('Balai Kelurahan');

  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [queues, setQueues] = useState<QueueRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [response, queueResponse] = await Promise.all([
        apiRequest<ApiSchedule[]>('/jadwal'),
        apiRequest<QueueRecord[]>('/antrean?status=MENUNGGU,DIPERIKSA,SELESAI,BATAL'),
      ]);
      setSchedules(response.data.map(mapSchedule));
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
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const scheduleDate = { day: selectedDay, month: currentMonth, year: currentYear };
    const duplicate = schedules.some((schedule) =>
      schedule.day === scheduleDate.day &&
      schedule.month === scheduleDate.month &&
      schedule.year === scheduleDate.year &&
      schedule.title.trim().toLocaleLowerCase() === formTitle.trim().toLocaleLowerCase() &&
      schedule.time.trim().toLocaleLowerCase() === formTime.trim().toLocaleLowerCase() &&
      schedule.location.trim().toLocaleLowerCase() === formLocation.trim().toLocaleLowerCase(),
    );
    if (duplicate) {
      setErrorMessage('Jadwal dengan nama, waktu, dan lokasi yang sama sudah tersedia pada tanggal tersebut.');
      return;
    }
    try {
      const response = await apiRequest<ApiSchedule>('/jadwal', {
        method: 'POST',
        body: JSON.stringify({
          tanggal: new Date(Date.UTC(currentYear, currentMonth, selectedDay, 1)).toISOString(),
          lokasi: formLocation,
          deskripsi: `${formTitle.trim()} • ${formTime.trim()}`,
        }),
      });
      const newSchedule = mapSchedule(response.data);
      setSchedules((prev) => [...prev, newSchedule]);
      setSelectedSchedule(null);
      setIsModalOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal menyimpan jadwal.');
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

  const todaySchedules = schedules.filter(
    (item) => item.day === realDay && item.month === realMonth && item.year === realYear
  );

  const upcomingSchedules = schedules.filter(
    (item) =>
      item.year > realYear ||
      (item.year === realYear && item.month > realMonth) ||
      (item.year === realYear && item.month === realMonth && item.day > realDay)
  );

  const groupedSchedules = (items: Schedule[]) => {
    const groups = new Map<string, Schedule[]>();
    for (const item of items) {
      const key = [
        item.year, item.month, item.day,
        item.title.trim().toLocaleLowerCase(),
        item.time.trim().toLocaleLowerCase(),
        item.location.trim().toLocaleLowerCase(),
      ].join('|');
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return Array.from(groups.values()).map((group) => {
      const scheduleIds = new Set(group.map((item) => item.id));
      const participantIds = new Set(
        queues.filter((queue) => scheduleIds.has(queue.jadwalId)).map((queue) => queue.pesertaId),
      );
      const preferredSchedule = [...group].sort((left, right) => {
        const statusRank = { BERJALAN: 0, MENDATANG: 1, SELESAI: 2 };
        return statusRank[left.status] - statusRank[right.status] || right.participants - left.participants;
      })[0];
      return {
        ...preferredSchedule,
        participants: participantIds.size || Math.max(...group.map((item) => item.participants)),
      };
    });
  };

  const displayedTodaySchedules = groupedSchedules(todaySchedules);
  const displayedUpcomingSchedules = groupedSchedules(upcomingSchedules);

  const calendarCells = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push({
      day,
      isCurrentMonth: true,
    });
  }

  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: false,
    });
  }

  return (
    <div className="w-full bg-white min-h-screen p-6 md:p-10 font-sans text-gray-800">
      
      {/* Header Halaman - Ketebalan Judul Disesuaikan */}
      <div className="flex justify-between items-center mb-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Jadwal Posyandu</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-lg leading-none font-bold">+</span>
          <span>Tambah Jadwal</span>
        </button>
      </div>

      <div className="max-w-5xl mx-auto">
        {errorMessage && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}
        {isLoading && <p role="status" className="mb-4 text-sm text-gray-500">Memuat jadwal...</p>}
      </div>

      {/* Grid Kalender & Kartu Informasi */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
        
        {/* Widget Kalender (Kiri) */}
        <div className="lg:col-span-4 border border-gray-200 rounded-2xl p-4 bg-white shadow-xs">
          
          {/* Header Kalender */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              onClick={handlePrevMonth}
              className="text-gray-600 hover:text-purple-600 p-1 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-gray-800">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-400"
              >
                {MONTHS.map((month, idx) => (
                  <option key={month} value={idx}>
                    {month}
                  </option>
                ))}
              </select>

              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-400"
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextMonth}
              className="text-gray-600 hover:text-purple-600 p-1 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Nama Hari */}
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-gray-400 mb-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          {/* Grid Tanggal */}
          <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
            {calendarCells.map((item, idx) => {
              const isSelected = item.isCurrentMonth && selectedDay === item.day;
              const hasSchedule = schedules.some(
                (s) => s.day === item.day && s.month === currentMonth && s.year === currentYear && item.isCurrentMonth
              );

              return (
                <div key={idx} className="flex justify-center items-center py-1">
                  {item.isCurrentMonth ? (
                    <button
                      type="button"
                      onClick={() => setSelectedDay(item.day)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-all cursor-pointer ${
                        isSelected || hasSchedule
                          ? 'bg-[#7E3AF2] text-white font-bold shadow-xs'
                          : 'text-gray-700 hover:bg-purple-50'
                      }`}
                    >
                      {item.day}
                    </button>
                  ) : (
                    <span className="w-7 h-7 flex items-center justify-center text-gray-300">
                      {item.day}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Kartu Informasi Jadwal (Kanan) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Kartu 1: Jadwal Hari Ini */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] text-white font-semibold px-5 py-2.5 text-sm">
              Jadwal Hari Ini
            </div>
            
            {todaySchedules.length > 0 ? (
              displayedTodaySchedules.map((schedule) => (
                <div key={schedule.id} className="p-5 flex gap-4 items-start">
                  <div className="text-[#7E3AF2] pt-0.5">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>

                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold text-gray-900 text-base">{schedule.title}</h3>
                    <p className="text-sm text-gray-700 font-medium">{schedule.time}</p>
                    <p className="text-sm text-gray-600">{schedule.location}</p>
                    <p className="text-sm text-gray-700 font-medium pt-0.5">
                      Peserta Terdaftar {schedule.participants}
                    </p>

                    <div className="pt-2">
                      <button
                        onClick={() => setSelectedSchedule(schedule)}
                        className="bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] hover:opacity-90 text-white font-medium text-xs px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                      >
                        Lihat Detail
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-gray-400 text-sm">Tidak ada jadwal untuk hari ini.</div>
            )}
          </div>

          {/* Kartu 2: Jadwal Mendatang - Teks Disesuaikan (Tidak Terlalu Tebal) */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] text-white font-semibold px-5 py-2.5 text-sm">
              Jadwal Mendatang
            </div>

            {upcomingSchedules.length > 0 ? (
              displayedUpcomingSchedules.map((schedule) => (
                <div key={schedule.id} className="p-5 flex gap-6 items-start">
                  <div className="text-lg font-bold text-gray-800 pt-0.5 min-w-[24px]">
                    {schedule.day}
                  </div>

                  <div className="space-y-1 flex-1">
                    <h3 className="font-bold text-gray-900 text-base">
                      {FULL_MONTHS[schedule.month]} {schedule.year}
                    </h3>
                    <p className="font-semibold text-gray-800 text-base">{schedule.title}</p>
                    <p className="text-sm text-gray-700 font-medium">{schedule.time}</p>
                    <p className="text-sm text-gray-600">{schedule.location}</p>

                    <div className="pt-2">
                      <button
                        onClick={() => setSelectedSchedule(schedule)}
                        className="bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] hover:opacity-90 text-white font-medium text-xs px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                      >
                        Lihat Detail
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-gray-400 text-sm">Belum ada jadwal mendatang.</div>
            )}
          </div>

        </div>

      </div>

      {/* MODAL DETAIL JADWAL */}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Detail Jadwal Posyandu</h2>
              <button
                onClick={() => setSelectedSchedule(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-800">
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-1">
                <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Nama Posyandu</span>
                <p className="text-lg font-bold text-gray-900">{selectedSchedule.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-200 p-3 rounded-xl">
                  <span className="text-xs text-gray-500 font-medium block mb-1">Tanggal</span>
                  <p className="font-semibold text-gray-800">
                    {selectedSchedule.day} {FULL_MONTHS[selectedSchedule.month]} {selectedSchedule.year}
                  </p>
                </div>

                <div className="border border-gray-200 p-3 rounded-xl">
                  <span className="text-xs text-gray-500 font-medium block mb-1">Waktu</span>
                  <p className="font-semibold text-gray-800">{selectedSchedule.time}</p>
                </div>
              </div>

              <div className="border border-gray-200 p-3 rounded-xl">
                <span className="text-xs text-gray-500 font-medium block mb-1">Lokasi</span>
                <p className="font-semibold text-gray-800">{selectedSchedule.location}</p>
              </div>

              <div className="border border-gray-200 p-3 rounded-xl">
                <span className="text-xs text-gray-500 font-medium block mb-1">Jumlah Peserta Terdaftar</span>
                <p className="font-semibold text-gray-800">{selectedSchedule.participants} Orang</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-5 mt-4 border-t border-gray-100">
              <button
                onClick={() => handleDeleteSchedule(selectedSchedule.id)}
                className="text-red-500 hover:text-red-700 text-xs font-bold px-3 py-2 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
              >
                Hapus Jadwal
              </button>

              <button
                onClick={() => setSelectedSchedule(null)}
                className="bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] hover:opacity-90 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM TAMBAH JADWAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tambah Jadwal Posyandu</h2>
            
            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div className="p-3 bg-purple-50 rounded-xl text-xs font-semibold text-purple-800 border border-purple-100 flex justify-between items-center">
                <span>Tanggal Terpilih:</span>
                <span className="text-sm font-bold">
                  {selectedDay} {FULL_MONTHS[currentMonth]} {currentYear}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Posyandu</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Contoh: Posyandu Melati"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Waktu Pelaksanaan</label>
                <input
                  type="text"
                  required
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Contoh: 08.00 - 12.00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Lokasi</label>
                <input
                  type="text"
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Contoh: Balai Kelurahan"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7E3AF2] to-[#E14ECA] hover:opacity-90 text-white text-sm font-semibold transition-all shadow-md cursor-pointer"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}