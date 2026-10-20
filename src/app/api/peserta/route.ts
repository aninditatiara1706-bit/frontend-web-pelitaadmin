import { Prisma, KategoriPeserta } from '@prisma/client';
import { currentUser } from '../../../lib/server/auth';
import { prisma } from '../../../lib/server/db';
import { failure, handleApiError, paginationMeta, readJson, success } from '../../../lib/server/response';
import { kategoriSchema, parseSearchParams, pesertaCreateSchema, paginationSchema, searchQuerySchema } from '../../../lib/server/validation';

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const params = parseSearchParams(new URL(request.url).searchParams);
    const pagination = paginationSchema.parse(params);
    const query = searchQuerySchema.parse(params.q) ?? '';
    const kategori = params.kategori ? kategoriSchema.parse(params.kategori) : undefined;
    const where: Prisma.PesertaWhereInput = {
      ...(kategori ? { kategori: kategori as KategoriPeserta } : {}),
      ...(query ? { OR: [{ nama: { contains: query, mode: 'insensitive' } }, { nik: { contains: query } }] } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.peserta.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (pagination.page - 1) * pagination.limit, take: pagination.limit }),
      prisma.peserta.count({ where }),
    ]);
    return success(items, 'Participants loaded', 200, paginationMeta(pagination.page, pagination.limit, total));
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const input = pesertaCreateSchema.parse(await readJson(request));
    const peserta = await prisma.peserta.create({ data: input });
    return success(peserta, 'Participant created', 201);
  } catch (error) { return handleApiError(error); }
}

