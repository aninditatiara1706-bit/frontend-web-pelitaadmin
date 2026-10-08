import { Prisma, KategoriPeserta } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { failure, paginationMeta, parseBody, success } from '../utils/response.js';
import { idSchema, kategoriSchema, paginationSchema, pesertaCreateSchema, pesertaUpdateSchema, searchSchema } from '../utils/validation.js';

const router = Router();
router.get('/', async (req, res, next) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const q = searchSchema.parse(req.query.q) ?? '';
    const kategori = req.query.kategori ? kategoriSchema.parse(req.query.kategori) as KategoriPeserta : undefined;
    const where: Prisma.PesertaWhereInput = { ...(kategori ? { kategori } : {}), ...(q ? { OR: [{ nama: { contains: q } }, { nik: { contains: q } }] } : {}) };
    const [data, total] = await prisma.$transaction([
      prisma.peserta.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.peserta.count({ where }),
    ]);
    return success(res, data, 'Participants loaded', 200, paginationMeta(page, limit, total));
  } catch (error) { return next(error); }
});
router.post('/', async (req, res, next) => {
  try {
    const data = await prisma.peserta.create({ data: parseBody(pesertaCreateSchema, req) });
    return success(res, data, 'Participant created', 201);
  } catch (error) { return next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const data = await prisma.peserta.findUnique({ where: { id }, include: { pemeriksaan: { orderBy: { tanggalPemeriksaan: 'desc' }, include: { jadwal: true } }, antrean: { orderBy: { tanggal: 'desc' }, include: { jadwal: true } } } });
    if (!data) return failure(res, 'Participant not found', 404);
    return success(res, data, 'Participant loaded');
  } catch (error) { return next(error); }
});
router.put('/:id', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const data = await prisma.peserta.update({ where: { id }, data: parseBody(pesertaUpdateSchema, req) });
    return success(res, data, 'Participant updated');
  } catch (error) { return next(error); }
});
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    await prisma.peserta.delete({ where: { id } });
    return success(res, { id }, 'Participant deleted');
  } catch (error) { return next(error); }
});
export default router;
