'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import ParticipantAvatar from '../../../components/ParticipantAvatar';
import { apiRequest, Examination, QueueRecord, displayCategory } from '../../../lib/api';

type CategoryKey = 'BALITA' | 'IBU_HAMIL' | 'LANSIA';
type QueueStatus = QueueRecord['status'];

type StoredDetailPayload = {
  queue?: QueueRecord;
  categoryKey?: CategoryKey;
  form?: Record<string, string>;
  examination?: Record<string, unknown>;
};

type HasilPemeriksaanProps = {
  id?: string;
};

const VALID_QUEUE_STATUSES: QueueStatus[] = ['SELESAI', 'MENUNGGU', 'DIPERIKSA', 'BATAL'];

function normalizeQueueStatus(rawStatus: unknown): QueueStatus {
  const normalized = String(rawStatus ?? 'SELESAI').toUpperCase();
  if (VALID_QUEUE_STATUSES.includes(normalized as QueueStatus)) {
    return normalized as QueueStatus;
  }
  return 'SELESAI';
}

function resolveCategoryKey(rawCategory?: string): CategoryKey {
  const normalized = (rawCategory ?? '').toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized.includes('IBU') || normalized.includes('HAMIL')) return 'IBU_HAMIL';
  if (normalized.includes('LANSIA')) return 'LANSIA';
  return 'BALITA';
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
  const candidateKeys = ['avatar', 'avatarUrl', 'avatar_url', 'foto', 'fotoUrl', 'foto_url', 'fotoProfil', 'image', 'imageUrl'];

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

function formatSubtitle(queue: QueueRecord, categoryKey: CategoryKey): string {
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

function HasilPemeriksaanContent({ id: propId }: HasilPemeriksaanProps) {
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();

  const recordId = propId ?? params?.id ?? '';
  const queryPesertaId = searchParams?.get('pesertaId') ?? '';
  const queryJadwalId = searchParams?.get('jadwalId') ?? '';
  const queryExamId = searchParams?.get('examId') ?? recordId;

  const [queue, setQueue] = useState<QueueRecord | null>(null);
  const [examination, setExamination] = useState<Record<string, unknown>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!recordId) {
        if (active) setIsLoading(false);
        return;
      }

      let cached: StoredDetailPayload | null = null;
      if (typeof window !== 'undefined') {
        const candidateKeys = [
          `hasil-pemeriksaan:${recordId}`,
          queryExamId ? `hasil-pemeriksaan:${queryExamId}` : '',
          queryPesertaId && queryJadwalId ? `hasil-pemeriksaan:${queryPesertaId}:${queryJadwalId}` : '',
        ].filter(Boolean);

        for (const key of candidateKeys) {
          const raw = window.sessionStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as StoredDetailPayload;
              if (parsed?.queue) {
                cached = parsed;
                break;
              }
            } catch {
              // abaikan JSON rusak
            }
          }
        }
      }

      if (cached?.queue) {
        if (!active) return;
        setQueue({
          ...cached.queue,
          tanggal: cached.queue.tanggal ?? new Date().toISOString(),
          status: normalizeQueueStatus(cached.queue.status),
        });
        setFormData(cached.form ?? {});
        setExamination(cached.examination ?? {});
        setIsLoading(false);
        return;
      }

      try {
        if (queryPesertaId && queryJadwalId) {
          const listRes = await apiRequest<Examination[]>(
            `/pemeriksaan?pesertaId=${encodeURIComponent(queryPesertaId)}&jadwalId=${encodeURIComponent(queryJadwalId)}`,
          );
          const list = Array.isArray(listRes.data) ? listRes.data : [];
          const matched =
            list.find((row) => String(row.id) === String(queryExamId)) ??
            list.find((row) => String(row.id) === String(recordId)) ??
            list[0];

          if (matched && active) {
            const rawExam = matched as Record<string, unknown>;
            const pesertaObj = (rawExam.peserta ?? {}) as Record<string, unknown>;
            const jadwalObj = (rawExam.jadwal ?? {}) as Record<string, unknown>;

            const builtQueue: QueueRecord = {
              id: String(rawExam.antreanId ?? recordId),
              pesertaId: String(rawExam.pesertaId ?? queryPesertaId),
              jadwalId: String(rawExam.jadwalId ?? queryJadwalId),
              noAntrean: Number(rawExam.noAntrean ?? 0),
              tanggal: String(rawExam.tanggalPemeriksaan ?? rawExam.tanggal ?? new Date().toISOString()),
              status: normalizeQueueStatus(rawExam.statusPemeriksaan ?? rawExam.status),
              peserta: pesertaObj as QueueRecord['peserta'],
              jadwal: jadwalObj as QueueRecord['jadwal'],
            };

            setQueue(builtQueue);
            setExamination(rawExam);
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem(
                `hasil-pemeriksaan:${recordId}`,
                JSON.stringify({ queue: builtQueue, examination: rawExam }),
              );
            }
            return;
          }
        }

        if (active) setQueue(null);
      } catch {
        if (active) setQueue(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [recordId, queryPesertaId, queryJadwalId, queryExamId]);

  const clearCachedResult = () => {
    if (typeof window === 'undefined') return;
    if (recordId) window.sessionStorage.removeItem(`hasil-pemeriksaan:${recordId}`);
    if (queryExamId) window.sessionStorage.removeItem(`hasil-pemeriksaan:${queryExamId}`);
    if (queue?.id) window.sessionStorage.removeItem(`hasil-pemeriksaan:${queue.id}`);
    if (queryPesertaId && queryJadwalId) {
      window.sessionStorage.removeItem(`hasil-pemeriksaan:${queryPesertaId}:${queryJadwalId}`);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#FAF9FC] p-8 text-center text-sm text-slate-500">
        Memuat hasil pemeriksaan...
      </main>
    );
  }

  if (!queue) {
    return (
      <main className="min-h-screen bg-[#FAF9FC] px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h1 className="text-lg font-bold text-slate-900">Data hasil pemeriksaan tidak ditemukan</h1>
          <Link
            href={queryPesertaId ? '/rekapitulasi' : '/pendaftaran-antrean'}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#7E3AF2] to-[#C44ED7] px-6 text-sm font-bold text-white"
          >
            {queryPesertaId ? 'Kembali ke rekapitulasi' : 'Kembali ke antrean'}
          </Link>
        </div>
      </main>
    );
  }

  const categoryKey = resolveCategoryKey(queue.peserta.kategori);
  const avatarUrl = resolveAvatarUrl(queue.peserta, examination, queue);

  const weight = formData.weight || (examination.beratBadan != null ? String(examination.beratBadan) : '');
  const height = formData.height || (examination.tinggiBadan != null ? String(examination.tinggiBadan) : '');
  const headCircumference =
    formData.headCircumference || (examination.lingkarKepala != null ? String(examination.lingkarKepala) : '');
  const statusBadgeText =
    formData.growthStatus ||
    (typeof examination.statusPertumbuhan === 'string' && examination.statusPertumbuhan) ||
    'Sesuai Usia';

  const bloodPressure =
    formData.bloodPressure || (typeof examination.tekananDarah === 'string' ? examination.tekananDarah : '');
  const gestationalAge =
    formData.gestationalAge || (typeof examination.usiaKehamilan === 'string' ? examination.usiaKehamilan : '');
  const lila = formData.lila || (typeof examination.lila === 'string' ? examination.lila : '');
  const bloodSugar = formData.bloodSugar || (typeof examination.gulaDarah === 'string' ? examination.gulaDarah : '');
  const pulseRate = formData.pulseRate || (typeof examination.denyutNadi === 'string' ? examination.denyutNadi : '');

  const immunizationType =
    formData.immunizationType || (typeof examination.jenisImunisasi === 'string' ? examination.jenisImunisasi : '');
  const immunizationDose =
    formData.immunizationDose || (typeof examination.dosisKe === 'string' ? examination.dosisKe : '');
  const ttImmunization =
    formData.ttImmunization || (typeof examination.imunisasiTT === 'string' ? examination.imunisasiTT : '');
  const ttdSupplement =
    formData.ttdSupplement || (typeof examination.pemberianTTD === 'string' ? examination.pemberianTTD : '');
  const chiefComplaint =
    formData.chiefComplaint || (typeof examination.keluhanUtama === 'string' ? examination.keluhanUtama : '');
  const medicalHistory =
    formData.medicalHistory || (typeof examination.riwayatPenyakit === 'string' ? examination.riwayatPenyakit : '');

  const notes =
    formData.notes ||
    (typeof examination.catatan === 'string' && examination.catatan) ||
    'Pertumbuhan sesuai usia tidak ada keluhan';

  const backHref = queryPesertaId ? '/rekapitulasi' : '/pendaftaran-antrean';

  return (
    <main className="min-h-screen bg-[#FAF9FC] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-lg font-bold text-slate-900">Hasil dan Catatan Pemeriksaan</h1>

        {/* Kartu Peserta */}
        <section className="mt-4 flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <ParticipantPhoto name={queue.peserta.nama} avatarUrl={avatarUrl} size={52} />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900">{queue.peserta.nama}</h2>
            <p className="text-xs text-slate-600">{formatSubtitle(queue, categoryKey)}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">No Antrean A-{queue.noAntrean}</p>
          </div>
        </section>

        {/* Kartu Hasil Pemeriksaan & Layanan/Skrining */}
        <section className="mt-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6">
          <h2 className="text-sm font-bold text-slate-900">Hasil Pemeriksaan</h2>

          {categoryKey === 'BALITA' && (
            <div className="mt-3 max-w-xs space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Berat Badan</span>
                <span className="font-medium text-slate-900">{weight ? `${weight} kg` : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Tinggi Badan</span>
                <span className="font-medium text-slate-900">{height ? `${height} cm` : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Lingkar Kepala</span>
                <span className="font-medium text-slate-900">{headCircumference ? `${headCircumference} cm` : '-'}</span>
              </div>
            </div>
          )}

          {categoryKey === 'IBU_HAMIL' && (
            <div className="mt-3 max-w-xs space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Berat Badan</span>
                <span className="font-medium text-slate-900">{weight ? `${weight} kg` : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Tinggi Badan</span>
                <span className="font-medium text-slate-900">{height ? `${height} cm` : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Tekanan Darah</span>
                <span className="font-medium text-slate-900">{bloodPressure ? `${bloodPressure} mmHg` : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Usia Kehamilan</span>
                <span className="font-medium text-slate-900">{gestationalAge || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">LILA</span>
                <span className="font-medium text-slate-900">{lila ? `${lila} cm` : '-'}</span>
              </div>
            </div>
          )}

          {categoryKey === 'LANSIA' && (
            <div className="mt-3 max-w-xs space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Tekanan Darah</span>
                <span className="font-medium text-slate-900">{bloodPressure ? `${bloodPressure} mmHg` : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Berat Badan</span>
                <span className="font-medium text-slate-900">{weight ? `${weight} kg` : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Gula Darah</span>
                <span className="font-medium text-slate-900">{bloodSugar || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Denyut Nadi</span>
                <span className="font-medium text-slate-900">{pulseRate || '-'}</span>
              </div>
            </div>
          )}

          {/* Badge Status */}
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-900">Status</p>
            <span className="mt-2 inline-flex rounded-full bg-[#84D668] px-4 py-1 text-xs font-semibold text-white">
              {statusBadgeText}
            </span>
          </div>

          {/* Bagian Sekunder per Kategori */}
          {categoryKey === 'BALITA' && (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-900">Pemberian Imunisasi</h3>
              {(immunizationType || immunizationDose) && (
                <p className="mt-2 text-xs text-slate-700">
                  {immunizationType} {immunizationDose ? `· Dosis ke-${immunizationDose}` : ''}
                </p>
              )}
            </div>
          )}

          {categoryKey === 'IBU_HAMIL' && (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-900">Suplementasi & Pelayanan</h3>
              <p className="mt-2 text-xs text-slate-700">
                Imunisasi TT: {ttImmunization || '-'} · TTD: {ttdSupplement || '-'}
              </p>
            </div>
          )}

          {categoryKey === 'LANSIA' && (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-900">Skrining Kesehatan</h3>
              <p className="mt-2 text-xs text-slate-700">
                Keluhan Utama: {chiefComplaint || '-'} · Riwayat Penyakit: {medicalHistory || '-'}
              </p>
            </div>
          )}
        </section>

        {/* Kartu Catatan */}
        <section className="mt-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6">
          <h2 className="text-sm font-bold text-slate-900">Catatan</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-700">{notes}</p>
        </section>

        {/* Tombol Kembali */}
        <div className="mt-6 flex justify-end">
          <Link
            href={backHref}
            onClick={clearCachedResult}
            className="inline-flex h-11 min-w-[180px] items-center justify-center rounded-xl bg-gradient-to-r from-[#7E3AF2] to-[#C44ED7] px-6 text-sm font-bold text-white shadow-sm transition hover:opacity-95"
          >
            Kembali
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function HasilPemeriksaan(props: HasilPemeriksaanProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FAF9FC] p-8 text-center text-sm text-slate-500">
          Memuat hasil pemeriksaan...
        </main>
      }
    >
      <HasilPemeriksaanContent {...props} />
    </Suspense>
  );
}