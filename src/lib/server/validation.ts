import { z } from 'zod';

export const roleSchema = z.enum(['ADMIN', 'KADER']);
export const kategoriSchema = z.enum(['BALITA', 'IBU_HAMIL', 'LANSIA']);
export const jenisKelaminSchema = z.enum(['LAKI_LAKI', 'PEREMPUAN']);
export const statusAntreanSchema = z.enum(['MENUNGGU', 'DIPERIKSA', 'SELESAI', 'BATAL']);
export const statusJadwalSchema = z.enum(['MENDATANG', 'BERJALAN', 'SELESAI']);

export const idSchema = z.string().cuid();
export const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Periode wajib menggunakan format YYYY-MM');
export const searchQuerySchema = z.string().trim().max(100).optional();
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export const pesertaCreateSchema = z.object({
  nik: z.string().regex(/^\d{16}$/, 'NIK wajib terdiri dari 16 digit'),
  nama: z.string().trim().min(2).max(120),
  tanggalLahir: z.coerce.date(),
  jenisKelamin: jenisKelaminSchema,
  kategori: kategoriSchema,
  alamat: z.string().trim().min(3).max(500),
  noTelepon: z.string().trim().max(20).optional().nullable(),
});

export const pesertaUpdateSchema = pesertaCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'Minimal satu kolom harus diubah',
);

export const jadwalCreateSchema = z.object({
  tanggal: z.coerce.date(),
  lokasi: z.string().trim().min(2).max(200),
  deskripsi: z.string().trim().max(1000).optional().nullable(),
  status: statusJadwalSchema.optional(),
});

export const antreanCreateSchema = z.object({
  pesertaId: idSchema,
  jadwalId: idSchema,
});

export const antreanStatusSchema = z.object({
  status: statusAntreanSchema,
});

export const pemeriksaanCreateSchema = z.object({
  pesertaId: idSchema,
  jadwalId: idSchema,
  tanggalPemeriksaan: z.coerce.date().optional(),
  tinggiBadan: z.coerce.number().positive().max(300).optional().nullable(),
  beratBadan: z.coerce.number().positive().max(500).optional().nullable(),
  lingkarKepala: z.coerce.number().positive().max(100).optional().nullable(),
  catatan: z.string().trim().max(3000).optional().nullable(),
  statusPemeriksaan: z.enum(['SELESAI', 'BELUM_DIPERIKSA']).default('SELESAI'),
});

export function parseSearchParams(params: URLSearchParams) {
  return {
    q: params.get('q')?.trim() ?? '',
    kategori: params.get('kategori'),
    page: params.get('page'),
    limit: params.get('limit'),
    periode: params.get('periode'),
    jadwalId: params.get('jadwalId'),
  };
}



