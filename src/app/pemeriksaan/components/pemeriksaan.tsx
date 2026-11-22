'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import ParticipantAvatar from '../../../components/ParticipantAvatar';
import { apiRequest, Examination, QueueRecord, displayCategory } from '../../../lib/api';

type CategoryKey = 'BALITA' | 'IBU_HAMIL' | 'LANSIA';

type FormPemeriksaanProps = {
  id?: string;
};

type ExaminationForm = {
  weight: string;
  height: string;
  headCircumference: string;
  growthStatus: string;
  immunizationType: string;
  immunizationDose: string;
  bloodPressure: string;
  gestationalAge: string;
  lila: string;
  ttImmunization: string;
  ttdSupplement: string;
  bloodSugar: string;
  pulseRate: string;
  chiefComplaint: string;
  medicalHistory: string;
  notes: string;
};

function resolveCategoryKey(rawCategory?: string): CategoryKey {
  const normalized = (rawCategory ?? '').toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized.includes('IBU') || normalized.includes('HAMIL')) return 'IBU_HAMIL';
  if (normalized.includes('LANSIA')) return 'LANSIA';
  return 'BALITA';
}

function categoryHeading(key: CategoryKey): string {
  if (key === 'IBU_HAMIL') return 'Pemeriksaan Ibu Hamil';
  if (key === 'LANSIA') return 'Pemeriksaan Lansia';
  return 'Pemeriksaan Balita';
}

function resolveBackendBaseUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    '';
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return 'http://localhost:4000';
}

function resolveAvatarUrl(...sources: Array<unknown>): string {
  const candidateKeys = [
    'avatar',
    'avatarUrl',
    'avatar_url',
    'foto',
    'fotoUrl',
    'foto_url',
    'fotoProfil',
    'image',
    'imageUrl',
  ];

  for (const src of sources) {
    if (!src) continue;
    if (typeof src === 'string') {
      const trimmed = src.trim();
      if (!trimmed) continue;
      if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) return trimmed;
      const base = resolveBackendBaseUrl();
      return `${base}/${trimmed.replace(/^\/+/, '')}`;
    }
    if (typeof src === 'object') {
      const obj = src as Record<string, unknown>;
      for (const key of candidateKeys) {
        const val = obj[key];
        if (typeof val === 'string' && val.trim()) {
          return resolveAvatarUrl(val);
        }
      }
    }
  }

  return '';
}

function ParticipantPhoto({
  name,
  avatarUrl,
  size = 52,
}: {
  name: string;
  avatarUrl: string;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full border border-slate-200 object-cover"
      />
    );
  }

  return <ParticipantAvatar name={name} size={size} />;
}

function formValues(record?: Examination): ExaminationForm {
  const ext = (record ?? {}) as Record<string, unknown>;
  return {
    weight: record?.beratBadan == null ? '' : String(record.beratBadan),
    height: record?.tinggiBadan == null ? '' : String(record.tinggiBadan),
    headCircumference: record?.lingkarKepala == null ? '' : String(record.lingkarKepala),
    growthStatus: typeof ext.statusPertumbuhan === 'string' ? ext.statusPertumbuhan : '',
    immunizationType: typeof ext.jenisImunisasi === 'string' ? ext.jenisImunisasi : 'BCG',
    immunizationDose: typeof ext.dosisKe === 'string' ? ext.dosisKe : '1',
    bloodPressure: typeof ext.tekananDarah === 'string' ? ext.tekananDarah : '',
    gestationalAge: typeof ext.usiaKehamilan === 'string' ? ext.usiaKehamilan : '',
    lila: typeof ext.lila === 'string' ? ext.lila : '',
    ttImmunization: typeof ext.imunisasiTT === 'string' ? ext.imunisasiTT : 'BCG',
    ttdSupplement: typeof ext.pemberianTTD === 'string' ? ext.pemberianTTD : '1',
    bloodSugar: typeof ext.gulaDarah === 'string' ? ext.gulaDarah : '',
    pulseRate: typeof ext.denyutNadi === 'string' ? ext.denyutNadi : '',
    chiefComplaint: typeof ext.keluhanUtama === 'string' ? ext.keluhanUtama : '',
    medicalHistory: typeof ext.riwayatPenyakit === 'string' ? ext.riwayatPenyakit : '',
    notes: record?.catatan ?? '',
  };
}

function formatParticipantSubtitle(queue: QueueRecord, categoryKey: CategoryKey): string {
  const label =
    displayCategory(queue.peserta.kategori) ||
    (categoryKey === 'IBU_HAMIL' ? 'Ibu Hamil' : categoryKey === 'LANSIA' ? 'Lansia' : 'Balita');
  const peserta = queue.peserta as Record<string, unknown>;
  const ageText =
    typeof peserta.usiaLabel === 'string' && peserta.usiaLabel.trim()
      ? peserta.usiaLabel
      : typeof peserta.usia === 'number'
        ? categoryKey === 'IBU_HAMIL'
          ? `${peserta.usia} Minggu`
          : `${peserta.usia} Tahun`
        : '';

  return ageText ? `${label} - ${ageText}` : label;
}

const inputClass =
  'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-[#7E3AF2] focus:ring-2 focus:ring-purple-100';

const labelClass = 'block text-xs font-medium text-slate-700';

const submitButtonClass =
  'mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#7E3AF2] to-[#C44ED7] px-6 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-wait disabled:opacity-50';

export default function FormPemeriksaan({ id: propId }: FormPemeriksaanProps) {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const queueId = propId ?? params?.id ?? '';

  const [queue, setQueue] = useState<QueueRecord | null>(null);
  const [record, setRecord] = useState<ExaminationForm>(formValues());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!queueId) {
        if (active) setIsLoading(false);
        return;
      }
      try {
        const queueResponse = await apiRequest<QueueRecord>(`/antrean/${queueId}`);
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
    return () => {
      active = false;
    };
  }, [queueId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!queue) return;
    setIsSaving(true);
    setErrorMessage('');

    const categoryKey = resolveCategoryKey(queue.peserta.kategori);

    try {
      const corePayload = {
        pesertaId: queue.pesertaId,
        jadwalId: queue.jadwalId,
        beratBadan: record.weight ? Number(record.weight) : 0,
        tinggiBadan: record.height ? Number(record.height) : 0,
        lingkarKepala: record.headCircumference ? Number(record.headCircumference) : null,
        catatan: record.notes || null,
        statusPemeriksaan: 'SELESAI',
      };

      const savedResponse = await apiRequest<Examination>('/pemeriksaan', {
        method: 'POST',
        body: JSON.stringify(corePayload),
      });

      const savedData = (savedResponse?.data ?? {}) as Record<string, unknown>;
      const targetId = String(queue.id);

      if (typeof window !== 'undefined') {
        const storedPayload = JSON.stringify({
          queue,
          categoryKey,
          form: record,
          examination: { ...corePayload, ...savedData },
        });
        window.sessionStorage.setItem(`hasil-pemeriksaan:${targetId}`, storedPayload);
        if (savedData.id) {
          window.sessionStorage.setItem(`hasil-pemeriksaan:${String(savedData.id)}`, storedPayload);
        }
      }

      router.push(`/hasil-pemeriksaan/${targetId}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal menyimpan pemeriksaan.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <main className="min-h-screen bg-[#FAF9FC] p-8 text-center text-sm text-slate-500">Memuat data pemeriksaan...</main>;
  }

  if (!queue) {
    return (
      <main className="min-h-screen bg-[#FAF9FC] p-5 sm:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <h1 className="text-xl font-bold text-slate-900">Data antrean tidak ditemukan</h1>
          {errorMessage && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
          <Link
            href="/pendaftaran-antrean"
            className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-[#7E3AF2] to-[#C44ED7] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Kembali ke antrean
          </Link>
        </div>
      </main>
    );
  }

  const categoryKey = resolveCategoryKey(queue.peserta.kategori);
  const avatarUrl = resolveAvatarUrl(queue.peserta, queue);

  return (
    <main className="min-h-screen bg-[#FAF9FC] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-lg font-bold text-slate-900">{categoryHeading(categoryKey)}</h1>

        <section className="mt-4 flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <ParticipantPhoto name={queue.peserta.nama} avatarUrl={avatarUrl} size={52} />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900">{queue.peserta.nama}</h2>
            <p className="text-xs text-slate-600">{formatParticipantSubtitle(queue, categoryKey)}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">No Antrean A-{queue.noAntrean}</p>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7"
        >
          {errorMessage && (
            <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
              {errorMessage}
            </p>
          )}

          {categoryKey === 'BALITA' && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Hasil Pengukuran</h3>
                <label className={labelClass}>
                  Berat Badan (kg)
                  <input
                    required
                    min="0.1"
                    max="200"
                    step="0.1"
                    type="number"
                    value={record.weight}
                    onChange={(e) => setRecord({ ...record, weight: e.target.value })}
                    placeholder="11.2"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Tinggi Badan (cm)
                  <input
                    required
                    min="1"
                    max="250"
                    step="0.1"
                    type="number"
                    value={record.height}
                    onChange={(e) => setRecord({ ...record, height: e.target.value })}
                    placeholder="85"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Lingkar Kepala (cm)
                  <input
                    min="1"
                    max="100"
                    step="0.1"
                    type="number"
                    value={record.headCircumference}
                    onChange={(e) => setRecord({ ...record, headCircumference: e.target.value })}
                    placeholder="45"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Status Pertumbuhan
                  <input
                    type="text"
                    value={record.growthStatus}
                    onChange={(e) => setRecord({ ...record, growthStatus: e.target.value })}
                    placeholder="Sesuai usia"
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Pemberian Imunisasi</h3>
                  <label className={labelClass}>
                    Jenis Imunisasi
                    <select
                      value={record.immunizationType}
                      onChange={(e) => setRecord({ ...record, immunizationType: e.target.value })}
                      className={inputClass}
                    >
                      <option value="BCG">BCG</option>
                      <option value="Hepatitis B">Hepatitis B</option>
                      <option value="DPT-HB-Hib">DPT-HB-Hib</option>
                      <option value="Polio">Polio</option>
                      <option value="Campak / MR">Campak / MR</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    Dosis ke-
                    <select
                      value={record.immunizationDose}
                      onChange={(e) => setRecord({ ...record, immunizationDose: e.target.value })}
                      className={inputClass}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </label>

                  <div className="pt-1">
                    <label className={labelClass}>
                      <span className="text-sm font-bold text-slate-900">Catatan</span>
                      <textarea
                        rows={4}
                        value={record.notes}
                        onChange={(e) => setRecord({ ...record, notes: e.target.value })}
                        placeholder="Pertumbuhan Sesuai Usia Tidak ada keluahan"
                        className={`${inputClass} resize-none`}
                      />
                    </label>
                  </div>
                </div>

                <button type="submit" disabled={isSaving} className={submitButtonClass}>
                  {isSaving ? 'Menyimpan...' : 'Simpan Pemeriksaan'}
                </button>
              </div>
            </div>
          )}

          {categoryKey === 'IBU_HAMIL' && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Hasil Pengukuran</h3>
                <label className={labelClass}>
                  Berat Badan (kg)
                  <input
                    required
                    min="1"
                    max="250"
                    step="0.1"
                    type="number"
                    value={record.weight}
                    onChange={(e) => setRecord({ ...record, weight: e.target.value })}
                    placeholder="11.2"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Tinggi Badan (cm)
                  <input
                    required
                    min="50"
                    max="250"
                    step="0.1"
                    type="number"
                    value={record.height}
                    onChange={(e) => setRecord({ ...record, height: e.target.value })}
                    placeholder="85"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Tekanan Darah (mmHg)
                  <input
                    type="text"
                    value={record.bloodPressure}
                    onChange={(e) => setRecord({ ...record, bloodPressure: e.target.value })}
                    placeholder="45"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Usia Kehamilan (Minggu)
                  <input
                    type="text"
                    value={record.gestationalAge}
                    onChange={(e) => setRecord({ ...record, gestationalAge: e.target.value })}
                    placeholder="Sesuai usia"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Lingkar Lengan Atas / LILA (cm)
                  <input
                    type="text"
                    value={record.lila}
                    onChange={(e) => setRecord({ ...record, lila: e.target.value })}
                    placeholder=""
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Suplementasi & Pelayanan</h3>
                  <label className={labelClass}>
                    Pemberian Imunisasi TT / Tetanus Toxoid
                    <select
                      value={record.ttImmunization}
                      onChange={(e) => setRecord({ ...record, ttImmunization: e.target.value })}
                      className={inputClass}
                    >
                      <option value="BCG">BCG</option>
                      <option value="TT1">TT1</option>
                      <option value="TT2">TT2</option>
                      <option value="TT3">TT3</option>
                      <option value="TT4">TT4</option>
                      <option value="TT5">TT5</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    Pemberian Tablet Tambah Darah (TTD)
                    <select
                      value={record.ttdSupplement}
                      onChange={(e) => setRecord({ ...record, ttdSupplement: e.target.value })}
                      className={inputClass}
                    >
                      <option value="1">1</option>
                      <option value="30 Tablet">30 Tablet</option>
                      <option value="60 Tablet">60 Tablet</option>
                      <option value="90 Tablet">90 Tablet</option>
                    </select>
                  </label>

                  <div className="pt-1">
                    <label className={labelClass}>
                      <span className="text-sm font-bold text-slate-900">Catatan</span>
                      <textarea
                        rows={4}
                        value={record.notes}
                        onChange={(e) => setRecord({ ...record, notes: e.target.value })}
                        placeholder="Pertumbuhan Sesuai Usia Tidak ada keluahan"
                        className={`${inputClass} resize-none`}
                      />
                    </label>
                  </div>
                </div>

                <button type="submit" disabled={isSaving} className={submitButtonClass}>
                  {isSaving ? 'Menyimpan...' : 'Simpan Pemeriksaan'}
                </button>
              </div>
            </div>
          )}

          {categoryKey === 'LANSIA' && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Hasil Pengukuran</h3>
                <label className={labelClass}>
                  Tekanan Darah (mmHg)
                  <input
                    type="text"
                    value={record.bloodPressure}
                    onChange={(e) => setRecord({ ...record, bloodPressure: e.target.value })}
                    placeholder="130/85"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Berat Badan (kg)
                  <input
                    required
                    min="1"
                    max="250"
                    step="0.1"
                    type="number"
                    value={record.weight}
                    onChange={(e) => setRecord({ ...record, weight: e.target.value })}
                    placeholder="58"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Gula Darah
                  <input
                    type="text"
                    value={record.bloodSugar}
                    onChange={(e) => setRecord({ ...record, bloodSugar: e.target.value })}
                    placeholder="140"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Denyut Nadi
                  <input
                    type="text"
                    value={record.pulseRate}
                    onChange={(e) => setRecord({ ...record, pulseRate: e.target.value })}
                    placeholder="80"
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Skrining Kesehatan</h3>
                  <label className={labelClass}>
                    Keluhan Utama
                    <input
                      type="text"
                      value={record.chiefComplaint}
                      onChange={(e) => setRecord({ ...record, chiefComplaint: e.target.value })}
                      placeholder="Nyeri sendi"
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Riwayat Penyakit
                    <input
                      type="text"
                      value={record.medicalHistory}
                      onChange={(e) => setRecord({ ...record, medicalHistory: e.target.value })}
                      placeholder="Hipertensi"
                      className={inputClass}
                    />
                  </label>

                  <div className="pt-1">
                    <label className={labelClass}>
                      <span className="text-sm font-bold text-slate-900">Catatan</span>
                      <textarea
                        rows={4}
                        value={record.notes}
                        onChange={(e) => setRecord({ ...record, notes: e.target.value })}
                        placeholder="Tekanan darah sedikit meningkat, disarankan kontrol rutin dan menjaga pola makan"
                        className={`${inputClass} resize-none`}
                      />
                    </label>
                  </div>
                </div>

                <button type="submit" disabled={isSaving} className={submitButtonClass}>
                  {isSaving ? 'Menyimpan...' : 'Simpan Pemeriksaan'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}