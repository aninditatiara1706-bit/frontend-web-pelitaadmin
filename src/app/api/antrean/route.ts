import { Prisma, StatusAntrean } from '@prisma/client';
import { currentUser } from '../../../lib/server/auth';
import { prisma } from '../../../lib/server/db';
import { failure, handleApiError, readJson, success } from '../../../lib/server/response';
import { antreanCreateSchema, idSchema, statusAntreanSchema } from '../../../lib/server/validation';

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const params = new URL(request.url).searchParams;
    const jadwalId = params.get('jadwalId') ? idSchema.parse(params.get('jadwalId')) : undefined;
    const statusValue = params.get('status');
    const status = statusValue ? statusValue.split(',').map((item) => statusAntreanSchema.parse(item)) : undefined;
    const where: Prisma.AntreanWhereInput = { ...(jadwalId ? { jadwalId } : {}), status: status ? { in: status } : { in: ['MENUNGGU', 'DIPERIKSA'] } };
    const antrean = await prisma.antrean.findMany({ where, orderBy: [{ tanggal: 'asc' }, { noAntrean: 'asc' }], include: { peserta: true, jadwal: true, } });
    return success(antrean, 'Active queue loaded');
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const input = antreanCreateSchema.parse(await readJson(request));
    const antrean = await prisma.$transaction(async (tx) => {
      const jadwal = await tx.jadwalPosyandu.findUnique({ where: { id: input.jadwalId } });
      if (!jadwal || jadwal.status === 'SELESAI') throw new Error('SCHEDULE_NOT_AVAILABLE');
      const latest = await tx.antrean.aggregate({ where: { jadwalId: input.jadwalId }, _max: { noAntrean: true } });
      return tx.antrean.create({
        data: { pesertaId: input.pesertaId, jadwalId: input.jadwalId, noAntrean: (latest._max.noAntrean ?? 0) + 1 },
        include: { peserta: true, jadwal: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return success(antrean, 'Queue registration created', 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'SCHEDULE_NOT_AVAILABLE') return failure('Schedule is not available for registration', 409);
    return handleApiError(error);
  }
}

