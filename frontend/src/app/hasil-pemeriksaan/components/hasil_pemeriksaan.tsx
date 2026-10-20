'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, MapPin, UserRound } from 'lucide-react';
import ParticipantAvatar from '../../../components/ParticipantAvatar';
import { apiRequest, Examination, QueueRecord, displayCategory } from '../../../lib/api';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export default function HasilPemeriksaan() {
  const params = useParams<{ id: string }>();
  const [queue, setQueue] = useState<QueueRecord | null>(null);
  const [examination, setExamination] = useState<Examination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const queueResponse = await apiRequest<QueueRecord>(`/antrean/${params.id}`);
        const examinationResponse = await apiRequest<Examination[]>(
          `/pemeriksaan?pesertaId=${encodeURIComponent(queueResponse.data.pesertaId)}&jadwalId=${encodeURIComponent(queueResponse.data.jadwalId)}`,
        );

        if (!active) return;

        setQueue(queueResponse.data);
        setExamination(examinationResponse.data[0] ?? null);
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Gagal memuat hasil pemeriksaan.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [params.id]);

  if (isLoading) {
    return <main className="min-h-screen p-8 text-center text-sm text-slate-500">Memuat hasil pemeriksaan...</main>;
  }

  if (!queue) {
    return (
      <main className="min-h-screen p-5 sm:p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Data pemeriksaan tidak ditemukan</h1>
          {errorMessage && <p role="alert" className="mt-3 text-sm text-red-700">{errorMessage}</p>}
          <Link href="/pendaftaran-antrean" className="mt-5 inline-flex rounded-xl bg-purple-700 px-4 py-2 text-sm font-semibold text-white">Kembali ke antrean</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/pendaftaran-antrean" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-purple-700 transition hover:text-purple-900">
          <ArrowLeft size={18} /> Kembali ke antrean
        </Link>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-600">Hasil Pemeriksaan</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Catatan pemeriksaan</h1>
          </div>

          <div className="flex items-center gap-4 px-5 py-6 sm:px-8">
            <ParticipantAvatar name={queue.peserta.nama} size={64} />
            <div>
              <h2 className="font-bold text-slate-900">{queue.peserta.nama}</h2>
              <p className="text-sm text-slate-600">{displayCategory(queue.peserta.kategori)} · {queue.peserta.nik}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Antrean A-{queue.noAntrean} · {queue.jadwal.lokasi}</p>
            </div>
          </div>

          {errorMessage && (
            <p role="alert" className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-8">
              {errorMessage}
            </p>
          )}

          <div className="grid gap-5 px-5 pb-7 sm:grid-cols-2 sm:px-8">
            <InfoCard icon={<UserRound size={16} />} label="Status" value={queue.status} />
            <InfoCard icon={<CalendarDays size={16} />} label="Tanggal pemeriksaan" value={examination ? formatDate(examination.tanggalPemeriksaan) : '-'} />
            <InfoCard icon={<MapPin size={16} />} label="Lokasi" value={queue.jadwal.lokasi} />
            <InfoCard icon={<MapPin size={16} />} label="Berat badan" value={examination?.beratBadan != null ? `${examination.beratBadan} kg` : '-'} />
            <InfoCard icon={<MapPin size={16} />} label="Tinggi badan" value={examination?.tinggiBadan != null ? `${examination.tinggiBadan} cm` : '-'} />
            <InfoCard icon={<MapPin size={16} />} label="Lingkar kepala" value={examination?.lingkarKepala != null ? `${examination.lingkarKepala} cm` : '-'} />
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-5 py-5 sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Catatan</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {examination?.catatan || 'Belum ada catatan pemeriksaan.'}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
