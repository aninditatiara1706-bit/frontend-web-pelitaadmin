import { currentUser } from '../../../lib/server/auth';
import { prisma } from '../../../lib/server/db';
import { failure, handleApiError, readJson, success } from '../../../lib/server/response';
import { idSchema, pemeriksaanCreateSchema } from '../../../lib/server/validation';

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const params = new URL(request.url).searchParams;
    const pesertaId = params.get('pesertaId') ? idSchema.parse(params.get('pesertaId')) : undefined;
    const jadwalId = params.get('jadwalId') ? idSchema.parse(params.get('jadwalId')) : undefined;
    const items = await prisma.pemeriksaan.findMany({ where: { ...(pesertaId ? { pesertaId } : {}), ...(jadwalId ? { jadwalId } : {}) }, orderBy: { tanggalPemeriksaan: 'desc' }, include: { peserta: true, jadwal: true } });
    return success(items, 'Examinations loaded');
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const input = pemeriksaanCreateSchema.parse(await readJson(request));
    const examination = await prisma.$transaction(async (tx) => {
      const queue = await tx.antrean.findUnique({ where: { jadwalId_pesertaId: { jadwalId: input.jadwalId, pesertaId: input.pesertaId } } });
      if (!queue || queue.status === 'BATAL') throw new Error('ACTIVE_QUEUE_REQUIRED');
      const record = await tx.pemeriksaan.upsert({
        where: { pesertaId_jadwalId: { pesertaId: input.pesertaId, jadwalId: input.jadwalId } },
        create: input,
        update: input,
        include: { peserta: true, jadwal: true },
      });
      await tx.antrean.update({ where: { id: queue.id }, data: { status: input.statusPemeriksaan === 'SELESAI' ? 'SELESAI' : 'DIPERIKSA' } });
      return record;
    });
    return success(examination, 'Examination saved', 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'ACTIVE_QUEUE_REQUIRED') return failure('An active queue registration is required before examination', 409);
    return handleApiError(error);
  }
}
