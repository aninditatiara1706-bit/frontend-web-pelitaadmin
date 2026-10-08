import { Router } from 'express';
import { prisma } from '../config/db.js';
import { failure, parseBody, success } from '../utils/response.js';
import { examinationSchema, idSchema } from '../utils/validation.js';

const router = Router();
router.get('/', async (req, res, next) => {
  try {
    const pesertaId = req.query.pesertaId ? idSchema.parse(req.query.pesertaId) : undefined;
    const jadwalId = req.query.jadwalId ? idSchema.parse(req.query.jadwalId) : undefined;
    const data = await prisma.pemeriksaan.findMany({ where: { ...(pesertaId ? { pesertaId } : {}), ...(jadwalId ? { jadwalId } : {}) }, orderBy: { tanggalPemeriksaan: 'desc' }, include: { peserta: true, jadwal: true } });
    return success(res, data, 'Examinations loaded');
  } catch (error) { return next(error); }
});
router.post('/', async (req, res, next) => {
  try {
    const input = parseBody(examinationSchema, req);
    const data = await prisma.$transaction(async (tx) => {
      const queue = await tx.antrean.findUnique({ where: { jadwalId_pesertaId: { jadwalId: input.jadwalId, pesertaId: input.pesertaId } } });
      if (!queue || queue.status === 'BATAL') throw new Error('ACTIVE_QUEUE_REQUIRED');
      const examination = await tx.pemeriksaan.upsert({ where: { pesertaId_jadwalId: { pesertaId: input.pesertaId, jadwalId: input.jadwalId } }, create: input, update: input, include: { peserta: true, jadwal: true } });
      await tx.antrean.update({ where: { id: queue.id }, data: { status: input.statusPemeriksaan === 'SELESAI' ? 'SELESAI' : 'DIPERIKSA' } });
      return examination;
    });
    return success(res, data, 'Examination saved', 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'ACTIVE_QUEUE_REQUIRED') return failure(res, 'Active queue registration is required before examination', 409);
    return next(error);
  }
});
export default router;
