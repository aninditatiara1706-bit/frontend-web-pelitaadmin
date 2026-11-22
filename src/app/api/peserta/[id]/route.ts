import { currentUser } from '../../../../lib/server/auth';
import { prisma } from '../../../../lib/server/db';
import { failure, handleApiError, readJson, success } from '../../../../lib/server/response';
import { idSchema, pesertaUpdateSchema } from '../../../../lib/server/validation';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const id = idSchema.parse((await context.params).id);
    const peserta = await prisma.peserta.findUnique({ where: { id }, include: { pemeriksaan: { orderBy: { tanggalPemeriksaan: 'desc' }, include: { jadwal: true } }, antrean: { orderBy: { tanggal: 'desc' }, include: { jadwal: true } } } });
    if (!peserta) return failure('Participant not found', 404);
    return success(peserta, 'Participant loaded');
  } catch (error) { return handleApiError(error); }
}

export async function PUT(request: Request, context: Context) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const id = idSchema.parse((await context.params).id);
    const input = pesertaUpdateSchema.parse(await readJson(request));
    const peserta = await prisma.peserta.update({ where: { id }, data: input });
    return success(peserta, 'Participant updated');
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    if (user.role !== 'ADMIN') return failure('Admin role required', 403);
    const id = idSchema.parse((await context.params).id);
    await prisma.peserta.delete({ where: { id } });
    return success({ id }, 'Participant deleted');
  } catch (error) { return handleApiError(error); }
}
