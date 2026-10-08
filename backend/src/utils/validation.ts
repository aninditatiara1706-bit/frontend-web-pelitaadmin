import { z } from 'zod';

export const idSchema = z.string().cuid();
export const roleSchema = z.enum(['ADMIN', 'KADER']);
export const kategoriSchema = z.enum(['BALITA', 'IBU_HAMIL', 'LANSIA']);
export const jenisKelaminSchema = z.enum(['LAKI_LAKI', 'PEREMPUAN']);
export const statusJadwalSchema = z.enum(['MENDATANG', 'BERJALAN', 'SELESAI']);
export const statusAntreanSchema = z.enum(['MENUNGGU', 'DIPERIKSA', 'SELESAI', 'BATAL']);
export const paginationSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(10) });
export const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const searchSchema = z.string().trim().max(100).optional();
export const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(128) });
export const pesertaCreateSchema = z.object({
  nik: z.string().regex(/^\d{16}$/, 'NIK wajib terdiri dari 16 digit'),
  nama: z.string().trim().min(2).max(120),
  tanggalLahir: z.coerce.date(),
  jenisKelamin: jenisKelaminSchema,
  kategori: kategoriSchema,
  alamat: z.string().trim().min(3).max(500),
  noTelepon: z.string().trim().max(20).nullable().optional(),
});
export const pesertaUpdateSchema = pesertaCreateSchema.partial().refine((data) => Object.keys(data).length > 0);
export const jadwalCreateSchema = z.object({ tanggal: z.coerce.date(), lokasi: z.string().trim().min(2).max(200), deskripsi: z.string().trim().max(1000).nullable().optional(), status: statusJadwalSchema.optional() });
export const antreanCreateSchema = z.object({ pesertaId: idSchema, jadwalId: idSchema });
export const antreanStatusSchema = z.object({ status: statusAntreanSchema });
export const examinationSchema = z.object({
  pesertaId: idSchema,
  jadwalId: idSchema,
  tanggalPemeriksaan: z.coerce.date().optional(),
  tinggiBadan: z.coerce.number().positive().max(300).nullable().optional(),
  beratBadan: z.coerce.number().positive().max(500).nullable().optional(),
  lingkarKepala: z.coerce.number().positive().max(100).nullable().optional(),
  catatan: z.string().trim().max(3000).nullable().optional(),
  statusPemeriksaan: z.enum(['SELESAI', 'BELUM_DIPERIKSA']).default('SELESAI'),
});
