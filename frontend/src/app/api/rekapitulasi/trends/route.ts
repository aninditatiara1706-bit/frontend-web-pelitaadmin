import { currentUser } from '../../../../lib/server/auth';
import { prisma } from '../../../../lib/server/db';
import { failure, handleApiError, success } from '../../../../lib/server/response';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const now = new Date();
    const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
    const rows = await prisma.pemeriksaan.findMany({
      where: { tanggalPemeriksaan: { gte: firstMonth }, statusPemeriksaan: 'SELESAI' },
      select: { tanggalPemeriksaan: true },
    });
    const counts = new Map<string, number>();
    for (let offset = 0; offset < 3; offset += 1) {
      const date = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + offset, 1));
      counts.set(date.toISOString().slice(0, 7), 0);
    }
    for (const row of rows) {
      const month = row.tanggalPemeriksaan.toISOString().slice(0, 7);
      if (counts.has(month)) counts.set(month, (counts.get(month) ?? 0) + 1);
    }
    const data = Array.from(counts, ([periode, jumlahPelayanan]) => ({ periode, jumlahPelayanan }));
    return success(data, 'Three-month service trends loaded');
  } catch (error) { return handleApiError(error); }
}
