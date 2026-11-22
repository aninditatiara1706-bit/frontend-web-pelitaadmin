import { Prisma, StatusJadwal } from '@prisma/client';
import { currentUser } from '../../../lib/server/auth';
import { prisma } from '../../../lib/server/db';
import { failure, handleApiError, readJson, success } from '../../../lib/server/response';
import { jadwalCreateSchema, statusJadwalSchema } from '../../../lib/server/validation';
import { z } from 'zod';

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const params = new URL(request.url).searchParams;
    const query = z.object({
      status: statusJadwalSchema.optional(),
      tanggalMulai: z.coerce.date().optional(),
      tanggalSelesai: z.coerce.date().optional(),
    }).refine((value) => !value.tanggalMulai || !value.tanggalSelesai || value.tanggalMulai <= value.tanggalSelesai, {
      message: 'tanggalMulai must be before or equal to tanggalSelesai',
    }).parse({
      status: params.get('status') ?? undefined,
      tanggalMulai: params.get('tanggalMulai') ?? undefined,
      tanggalSelesai: params.get('tanggalSelesai') ?? undefined,
    });
    const where: Prisma.JadwalPosyanduWhereInput = {
      ...(query.status ? { status: query.status as StatusJadwal } : {}),
      ...(query.tanggalMulai || query.tanggalSelesai ? { tanggal: { ...(query.tanggalMulai ? { gte: query.tanggalMulai } : {}), ...(query.tanggalSelesai ? { lte: query.tanggalSelesai } : {}) } } : {}),
    };
    const jadwal = await prisma.jadwalPosyandu.findMany({ where, orderBy: { tanggal: 'asc' }, include: { _count: { select: { antrean: true, pemeriksaan: true } } } });
    return success(jadwal, 'Schedules loaded');
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const input = jadwalCreateSchema.parse(await readJson(request));
    const jadwal = await prisma.jadwalPosyandu.create({ data: input });
    return success(jadwal, 'Schedule created', 201);
  } catch (error) { return handleApiError(error); }
}


