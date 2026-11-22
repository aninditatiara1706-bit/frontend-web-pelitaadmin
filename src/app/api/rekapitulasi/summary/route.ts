import { KategoriPeserta, StatusPemeriksaan } from '@prisma/client';
import { currentUser } from '../../../../lib/server/auth';
import { prisma } from '../../../../lib/server/db';
import { failure, handleApiError, success } from '../../../../lib/server/response';
import { periodSchema } from '../../../../lib/server/validation';

function monthStart(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) throw new Error('INVALID_PERIOD');
  const [year, month] = value.split('-').map(Number);
  if (month < 1 || month > 12) throw new Error('INVALID_PERIOD');
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const period = periodSchema.parse(new URL(request.url).searchParams.get('periode') ?? new Date().toISOString().slice(0, 7));
    const { start, end } = monthStart(period);
    const [registered, examined] = await Promise.all([
      prisma.antrean.groupBy({ by: ['pesertaId'], where: { tanggal: { gte: start, lt: end }, status: { not: 'BATAL' } } }),
      prisma.pemeriksaan.findMany({ where: { tanggalPemeriksaan: { gte: start, lt: end }, statusPemeriksaan: StatusPemeriksaan.SELESAI }, select: { pesertaId: true, peserta: { select: { kategori: true } } } }),
    ]);
    const counts = Object.fromEntries(Object.values(KategoriPeserta).map((category) => [category, { terdaftar: 0, diperiksa: 0, belumDiperiksa: 0 }])) as Record<KategoriPeserta, { terdaftar: number; diperiksa: number; belumDiperiksa: number }>;
    const participantsById = await prisma.peserta.findMany({ where: { id: { in: registered.map((item) => item.pesertaId) } }, select: { id: true, kategori: true } });
    const categoryById = new Map(participantsById.map((item) => [item.id, item.kategori]));
    for (const item of registered) {
      const category = categoryById.get(item.pesertaId);
      if (category) counts[category].terdaftar += 1;
    }
    const examinedParticipants = new Set<string>();
    for (const item of examined) {
      if (examinedParticipants.has(item.pesertaId)) continue;
      examinedParticipants.add(item.pesertaId);
      counts[item.peserta.kategori].diperiksa += 1;
    }
    for (const category of Object.values(KategoriPeserta)) counts[category].belumDiperiksa = Math.max(0, counts[category].terdaftar - counts[category].diperiksa);
    return success({ periode: period, perKategori: counts, total: Object.values(counts).reduce((sum, item) => ({ terdaftar: sum.terdaftar + item.terdaftar, diperiksa: sum.diperiksa + item.diperiksa, belumDiperiksa: sum.belumDiperiksa + item.belumDiperiksa }), { terdaftar: 0, diperiksa: 0, belumDiperiksa: 0 }) }, 'Service summary loaded');
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_PERIOD') return failure('periode must use YYYY-MM format', 400);
    return handleApiError(error);
  }
}


