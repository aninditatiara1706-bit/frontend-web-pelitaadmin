import { KategoriPeserta } from '@prisma/client';
import { currentUser } from '../../../../lib/server/auth';
import { prisma } from '../../../../lib/server/db';
import { failure, handleApiError, success } from '../../../../lib/server/response';
import { periodSchema } from '../../../../lib/server/validation';

function getMonthRange(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) throw new Error('INVALID_PERIOD');
  const [year, month] = value.split('-').map(Number);
  if (month < 1 || month > 12) throw new Error('INVALID_PERIOD');
  const start = new Date(Date.UTC(year, month - 1, 1));
  return { start, end: new Date(Date.UTC(year, month, 1)), previousStart: new Date(Date.UTC(year, month - 2, 1)) };
}

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const period = periodSchema.parse(new URL(request.url).searchParams.get('periode') ?? new Date().toISOString().slice(0, 7));
    const { start, end, previousStart } = getMonthRange(period);
    const [current, previous] = await Promise.all([
      prisma.peserta.groupBy({ by: ['kategori'], where: { createdAt: { gte: start, lt: end } }, _count: { _all: true } }),
      prisma.peserta.count({ where: { createdAt: { gte: previousStart, lt: start } } }),
    ]);
    const byCategory = Object.fromEntries(Object.values(KategoriPeserta).map((category) => [category, 0])) as Record<KategoriPeserta, number>;
    for (const item of current) byCategory[item.kategori] = item._count._all;
    const total = Object.values(byCategory).reduce((sum, value) => sum + value, 0);
    const percentageChange = previous === 0 ? (total === 0 ? 0 : null) : Number((((total - previous) / previous) * 100).toFixed(1));
    return success({ periode: period, totalPeserta: total, perKategori: byCategory, bulanSebelumnya: previous, perubahanPersen: percentageChange }, 'Summary statistics loaded');
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_PERIOD') return failure('periode must use YYYY-MM format', 400);
    return handleApiError(error);
  }
}

