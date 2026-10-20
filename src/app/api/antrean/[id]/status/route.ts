import { StatusAntrean } from '@prisma/client';
import { currentUser } from '../../../../../lib/server/auth';
import { prisma } from '../../../../../lib/server/db';
import { failure, handleApiError, readJson, success } from '../../../../../lib/server/response';
import { antreanStatusSchema, idSchema } from '../../../../../lib/server/validation';

type Context = { params: Promise<{ id: string }> };
const allowedTransitions: Record<StatusAntrean, StatusAntrean[]> = {
  MENUNGGU: ['DIPERIKSA', 'BATAL'],
  DIPERIKSA: ['SELESAI', 'BATAL'],
  SELESAI: [],
  BATAL: [],
};

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const id = idSchema.parse((await context.params).id);
    const { status } = antreanStatusSchema.parse(await readJson(request));
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.antrean.findUnique({ where: { id } });
      if (!current) return null;
      if (!allowedTransitions[current.status].includes(status)) throw new Error('INVALID_STATUS_TRANSITION');
      const queue = await tx.antrean.update({ where: { id }, data: { status }, include: { peserta: true, jadwal: true } });
      if (status === 'DIPERIKSA' || status === 'SELESAI') {
        await tx.pemeriksaan.upsert({
          where: { pesertaId_jadwalId: { pesertaId: current.pesertaId, jadwalId: current.jadwalId } },
          create: { pesertaId: current.pesertaId, jadwalId: current.jadwalId, statusPemeriksaan: status === 'SELESAI' ? 'SELESAI' : 'BELUM_DIPERIKSA' },
          update: { statusPemeriksaan: status === 'SELESAI' ? 'SELESAI' : 'BELUM_DIPERIKSA' },
        });
      }
      return queue;
    });
    if (!updated) return failure('Queue record not found', 404);
    return success(updated, 'Queue status updated');
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_STATUS_TRANSITION') return failure('Invalid queue status transition', 409);
    return handleApiError(error);
  }
}
