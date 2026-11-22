import { Prisma, KategoriPeserta } from '@prisma/client';
import { currentUser } from '../../../../lib/server/auth';
import { prisma } from '../../../../lib/server/db';
import { failure, handleApiError, paginationMeta, success } from '../../../../lib/server/response';
import { kategoriSchema, paginationSchema, searchQuerySchema } from '../../../../lib/server/validation';

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return failure('Authentication required', 401);
    const params = new URL(request.url).searchParams;
    const pagination = paginationSchema.parse({ page: params.get('page'), limit: params.get('limit') });
    const query = searchQuerySchema.parse(params.get('q') ?? undefined) ?? '';
    const kategori = params.get('kategori') ? kategoriSchema.parse(params.get('kategori')) as KategoriPeserta : undefined;
    const where: Prisma.PemeriksaanWhereInput = {
      ...(kategori ? { peserta: { kategori } } : {}),
      ...(query ? { peserta: { ...(kategori ? { kategori } : {}), OR: [{ nama: { contains: query, mode: 'insensitive' } }, { nik: { contains: query } }] } } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.pemeriksaan.findMany({ where, orderBy: { tanggalPemeriksaan: 'desc' }, skip: (pagination.page - 1) * pagination.limit, take: pagination.limit, include: { peserta: true, jadwal: true } }),
      prisma.pemeriksaan.count({ where }),
    ]);
    return success(items, 'Examination history loaded', 200, paginationMeta(pagination.page, pagination.limit, total));
  } catch (error) { return handleApiError(error); }
}

