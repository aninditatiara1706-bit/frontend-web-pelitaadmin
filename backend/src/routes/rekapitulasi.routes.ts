import { KategoriPeserta, Prisma, StatusPemeriksaan } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../config/db.js';
import { failure, paginationMeta, success } from '../utils/response.js';
import { kategoriSchema, paginationSchema, periodSchema, searchSchema } from '../utils/validation.js';

const router = Router();
function monthRange(period: string) {
  const [year, month] = periodSchema.parse(period).split('-').map(Number);
  return { start: new Date(Date.UTC(year!, month! - 1, 1)), end: new Date(Date.UTC(year!, month!, 1)), previousStart: new Date(Date.UTC(year!, month! - 2, 1)) };
}
router.get('/stats', async (req, res, next) => {
  try {
    const period = periodSchema.parse(req.query.periode ?? new Date().toISOString().slice(0, 7));
    const { start, end, previousStart } = monthRange(period);
    const [groups, currentPeriodCount, previous] = await Promise.all([
      prisma.peserta.groupBy({ by: ['kategori'], _count: { _all: true } }),
      prisma.peserta.count({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.peserta.count({ where: { createdAt: { gte: previousStart, lt: start } } }),
    ]);
    const categories = Object.fromEntries(Object.values(KategoriPeserta).map((category) => [category, 0])) as Record<KategoriPeserta, number>;
    for (const group of groups) categories[group.kategori] = group._count._all;
    const totalPeserta = Object.values(categories).reduce((sum, item) => sum + item, 0);
    const changePercent = previous === 0 ? (currentPeriodCount === 0 ? 0 : null) : Number((((currentPeriodCount - previous) / previous) * 100).toFixed(1));
    return success(res, { periode: period, totalPeserta, perKategori: categories, pesertaBaruPeriode: currentPeriodCount, pesertaBaruBulanSebelumnya: previous, perubahanPersen: changePercent }, 'Summary statistics loaded');
  } catch (error) { return next(error); }
});
router.get('/summary', async (req, res, next) => {
  try {
    const period = periodSchema.parse(req.query.periode ?? new Date().toISOString().slice(0, 7));
    const { start, end } = monthRange(period);
    const [registered, checked] = await Promise.all([
      prisma.antrean.findMany({ where: { tanggal: { gte: start, lt: end }, status: { not: 'BATAL' } }, distinct: ['pesertaId'], select: { pesertaId: true, peserta: { select: { kategori: true } } } }),
      prisma.pemeriksaan.findMany({ where: { tanggalPemeriksaan: { gte: start, lt: end }, statusPemeriksaan: StatusPemeriksaan.SELESAI }, distinct: ['pesertaId'], select: { pesertaId: true, peserta: { select: { kategori: true } } } }),
    ]);
    const counts = Object.fromEntries(Object.values(KategoriPeserta).map((category) => [category, { terdaftar: 0, diperiksa: 0, belumDiperiksa: 0 }])) as Record<KategoriPeserta, { terdaftar: number; diperiksa: number; belumDiperiksa: number }>;
    for (const row of registered) counts[row.peserta.kategori].terdaftar += 1;
    for (const row of checked) counts[row.peserta.kategori].diperiksa += 1;
    for (const row of Object.values(counts)) row.belumDiperiksa = Math.max(0, row.terdaftar - row.diperiksa);
    const total = Object.values(counts).reduce((sum, row) => ({ terdaftar: sum.terdaftar + row.terdaftar, diperiksa: sum.diperiksa + row.diperiksa, belumDiperiksa: sum.belumDiperiksa + row.belumDiperiksa }), { terdaftar: 0, diperiksa: 0, belumDiperiksa: 0 });
    return success(res, { periode: period, perKategori: counts, total }, 'Service summary loaded');
  } catch (error) { return next(error); }
});
router.get('/trends', async (_req, res, next) => {
  try {
    const current = new Date();
    const start = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 2, 1));
    const records = await prisma.pemeriksaan.findMany({ where: { tanggalPemeriksaan: { gte: start }, statusPemeriksaan: 'SELESAI' }, select: { tanggalPemeriksaan: true } });
    const months = new Map<string, number>();
    for (let offset = 0; offset < 3; offset += 1) months.set(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1)).toISOString().slice(0, 7), 0);
    for (const record of records) {
      const key = record.tanggalPemeriksaan.toISOString().slice(0, 7);
      if (months.has(key)) months.set(key, months.get(key)! + 1);
    }
    return success(res, Array.from(months, ([periode, jumlahPelayanan]) => ({ periode, jumlahPelayanan })), 'Three-month service trends loaded');
  } catch (error) { return next(error); }
});
router.get('/riwayat', async (req, res, next) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const q = searchSchema.parse(req.query.q) ?? '';
    const kategori = req.query.kategori ? kategoriSchema.parse(req.query.kategori) as KategoriPeserta : undefined;
    const participantWhere: Prisma.PesertaWhereInput = { ...(kategori ? { kategori } : {}), ...(q ? { OR: [{ nama: { contains: q } }, { nik: { contains: q } }] } : {}) };
    const where: Prisma.PemeriksaanWhereInput = q || kategori ? { peserta: participantWhere } : {};
    const [data, total] = await prisma.$transaction([
      prisma.pemeriksaan.findMany({ where, orderBy: { tanggalPemeriksaan: 'desc' }, skip: (page - 1) * limit, take: limit, include: { peserta: true, jadwal: true } }),
      prisma.pemeriksaan.count({ where }),
    ]);
    return success(res, data, 'Examination history loaded', 200, paginationMeta(page, limit, total));
  } catch (error) { return next(error); }
});
export default router;
