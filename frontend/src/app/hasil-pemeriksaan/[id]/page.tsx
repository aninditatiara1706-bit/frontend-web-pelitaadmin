'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, ClipboardCheck, PencilLine } from 'lucide-react';
import ParticipantAvatar from '../../../components/ParticipantAvatar';
import { apiRequest, Examination, QueueRecord, displayCategory } from '../../../lib/api';

function metric(value: string | number | null, unit: string) {
  return <>{value == null ? '—' : value} <span className="text-sm font-medium text-slate-500">{unit}</span></>;
}

export default function ExaminationResultPage() {
  const params = useParams<{ id: string }>();
  const [queue, setQueue] = useState<QueueRecord | null>(null);
  const [record, setRecord] = useState<Examination | null>(null);
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
        setRecord(examinationResponse.data[0] ?? null);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Gagal memuat hasil pemeriksaan.');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [params.id]);

  if (isLoading) return <main className="min-h-screen p-8 text-center text-sm text-slate-500">Memuat hasil pemeriksaan...</main>;
  if (!queue) {
    return (
      <main className="min-h-screen p-5 sm:p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Antrean tidak ditemukan</h1>
          {errorMessage && <p role="alert" className="mt-3 text-sm text-red-700">{errorMessage}</p>}
          <Link href="/pendaftaran-antrean" className="mt-5 inline-flex rounded-xl bg-purple-700 px-4 py-2 text-sm font-semibold text-white">Kembali ke antrean</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/pendaftaran-antrean" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-purple-700 transition hover:text-purple-900"><ArrowLeft size={18} /> Kembali ke antrean</Link>
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-col gap-5 border-b border-slate-100 px-5 py-6 sm:flex-row sm:items-center sm:px-8">
            <ParticipantAvatar name={queue.peserta.nama} size={80} />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-600">Riwayat pelayanan</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Hasil & Catatan Pemeriksaan</h1>
              <p className="mt-2 font-semibold text-slate-800">{queue.peserta.nama}</p>
              <p className="text-sm text-slate-600">{displayCategory(queue.peserta.kategori)} · NIK {queue.peserta.nik} · Antrean A-{queue.noAntrean}</p>
            </div>
            {record && <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><ClipboardCheck size={15} /> Selesai diperiksa</span>}
          </header>

          {errorMessage && <p role="alert" className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-8">{errorMessage}</p>}
          {!record ? (
            <div className="px-5 py-10 text-center sm:px-8">
              <h2 className="font-bold text-slate-900">Belum ada hasil pemeriksaan</h2>
              <p className="mt-2 text-sm text-slate-600">Data pemeriksaan peserta ini belum disimpan.</p>
              <Link href={`/pemeriksaan/${queue.id}`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800"><PencilLine size={16} /> Mulai pemeriksaan</Link>
            </div>
          ) : (
            <>
              <section className="px-5 py-6 sm:px-8">
                <h2 className="mb-4 text-lg font-bold text-slate-900">Hasil Pemeriksaan</h2>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Berat badan</dt><dd className="mt-1 text-xl font-bold text-slate-900">{metric(record.beratBadan, 'kg')}</dd></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Tinggi badan</dt><dd className="mt-1 text-xl font-bold text-slate-900">{metric(record.tinggiBadan, 'cm')}</dd></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Lingkar kepala</dt><dd className="mt-1 text-xl font-bold text-slate-900">{metric(record.lingkarKepala, 'cm')}</dd></div>
                </dl>
                <div className="mt-5">
                  <h2 className="text-sm font-bold text-slate-900">Status</h2>
                  <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800">Data tercatat</span>
                </div>
              </section>
              <section className="border-t border-slate-100 px-5 py-6 sm:px-8">
                <h2 className="text-lg font-bold text-slate-900">Catatan pemeriksaan</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{record.catatan || 'Tidak ada catatan tambahan.'}</p>
                <p className="mt-4 text-xs text-slate-400">Tanggal pemeriksaan: {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(record.tanggalPemeriksaan))}</p>
              </section>
              <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-5 sm:flex-row sm:justify-end sm:px-8">
                <Link href="/pendaftaran-antrean" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-purple-600 px-6 text-sm font-semibold text-purple-700 transition hover:bg-purple-50">Kembali</Link>
                <Link href={`/pemeriksaan/${queue.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7E3AF2] to-[#C44ED7] px-6 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"><PencilLine size={16} /> Ubah pemeriksaan</Link>
              </footer>
            </>
          )}
        </article>
      </div>
    </main>
  );
}
