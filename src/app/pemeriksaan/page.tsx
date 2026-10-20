'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import ParticipantAvatar from '../../components/ParticipantAvatar';
import { apiRequest, Examination, QueueRecord, displayCategory } from '../../lib/api';

type ExaminationForm = { weight: string; height: string; headCircumference: string; notes: string };

function formValues(record?: Examination): ExaminationForm {
  return {
    weight: record?.beratBadan == null ? '' : String(record.beratBadan),
    height: record?.tinggiBadan == null ? '' : String(record.tinggiBadan),
    headCircumference: record?.lingkarKepala == null ? '' : String(record.lingkarKepala),
    notes: record?.catatan ?? '',
  };
}

export default function ExaminationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [queue, setQueue] = useState<QueueRecord | null>(null);
  const [record, setRecord] = useState<ExaminationForm>(formValues());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
        setRecord(formValues(examinationResponse.data[0]));
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Gagal memuat data pemeriksaan.');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [params.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!queue) return;
    setIsSaving(true);
    setErrorMessage('');
    try {
      await apiRequest<Examination>('/pemeriksaan', {
        method: 'POST',
        body: JSON.stringify({
          pesertaId: queue.pesertaId,
          jadwalId: queue.jadwalId,
          beratBadan: Number(record.weight),
          tinggiBadan: Number(record.height),
          lingkarKepala: record.headCircumference ? Number(record.headCircumference) : null,
          catatan: record.notes || null,
          statusPemeriksaan: 'SELESAI',
        }),
      });
      router.push(`/hasil-pemeriksaan/${queue.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal menyimpan pemeriksaan.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <main className="min-h-screen p-8 text-center text-sm text-slate-500">Memuat data pemeriksaan...</main>;
  if (!queue) {
    return (
      <main className="min-h-screen p-5 sm:p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Data antrean tidak ditemukan</h1>
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
        <form onSubmit={handleSubmit} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-600">Pemeriksaan Posyandu</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Form Pemeriksaan</h1>
          </div>
          <div className="flex items-center gap-4 px-5 py-6 sm:px-8">
            <ParticipantAvatar name={queue.peserta.nama} size={64} />
            <div>
              <h2 className="font-bold text-slate-900">{queue.peserta.nama}</h2>
              <p className="text-sm text-slate-600">{displayCategory(queue.peserta.kategori)} · {queue.peserta.nik}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Antrean A-{queue.noAntrean} · {queue.jadwal.lokasi}</p>
            </div>
          </div>
          {errorMessage && <p role="alert" className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-8">{errorMessage}</p>}
          <div className="grid gap-5 px-5 pb-6 sm:grid-cols-2 sm:px-8">
            <label className="block text-sm font-semibold text-slate-700">Berat badan <span className="font-normal text-slate-400">(kg)</span><input required min="0.1" max="500" step="0.1" type="number" value={record.weight} onChange={(event) => setRecord({ ...record, weight: event.target.value })} placeholder="Contoh: 11.2" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100" /></label>
            <label className="block text-sm font-semibold text-slate-700">Tinggi badan <span className="font-normal text-slate-400">(cm)</span><input required min="0.1" max="300" step="0.1" type="number" value={record.height} onChange={(event) => setRecord({ ...record, height: event.target.value })} placeholder="Contoh: 85" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100" /></label>
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Lingkar kepala <span className="font-normal text-slate-400">(cm, opsional)</span><input min="0.1" max="100" step="0.1" type="number" value={record.headCircumference} onChange={(event) => setRecord({ ...record, headCircumference: event.target.value })} placeholder="Contoh: 46" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100" /></label>
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Catatan pemeriksaan<textarea rows={4} value={record.notes} onChange={(event) => setRecord({ ...record, notes: event.target.value })} placeholder="Tuliskan keluhan atau catatan pemeriksaan..." className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100" /></label>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-5 sm:flex-row sm:justify-end sm:px-8">
            <Link href="/pendaftaran-antrean" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-purple-600 px-6 text-sm font-semibold text-purple-700 transition hover:bg-purple-50">Batal</Link>
            <button type="submit" disabled={isSaving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7E3AF2] to-[#C44ED7] px-6 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-wait disabled:opacity-50"><Save size={17} /> {isSaving ? 'Menyimpan...' : 'Simpan pemeriksaan'}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
