import { Prisma } from '@prisma/client';
import { ErrorRequestHandler, Request, Response } from 'express';
import { ZodError } from 'zod';

export function success<T>(res: Response, data: T, message = 'Operation successful', status = 200, meta?: unknown) {
  return res.status(status).set('Cache-Control', 'private, no-store').json({ success: true, message, data, ...(meta ? { meta } : {}) });
}

export function failure(res: Response, message: string, status: number, details?: unknown) {
  return res.status(status).set('Cache-Control', 'private, no-store').json({ success: false, message, ...(details ? { details } : {}) });
}

export function parseBody<T>(schema: { parse(value: unknown): T }, req: Request) {
  return schema.parse(req.body);
}

export function paginationMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) return failure(res, 'Validation failed', 400, error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })));
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error('Database initialization failed:', {
      name: error.name,
      errorCode: error.errorCode,
    });
    if (!process.env.DATABASE_URL) {
      return failure(res, 'Database belum dikonfigurasi. Isi DATABASE_URL di backend/.env, lalu restart backend.', 503);
    }
    return failure(res, 'Database tidak dapat dihubungi. Periksa DATABASE_URL dan pastikan server database aktif.', 503);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return failure(res, 'Data conflicts with an existing record', 409);
    if (error.code === 'P2003') return failure(res, 'Related record was not found or is still in use', 409);
    if (error.code === 'P2025') return failure(res, 'Record not found', 404);
    if (error.code === 'P2034') return failure(res, 'Concurrent update conflict; retry the request', 409);
  }
  if (error instanceof Error && error.message === 'ACTIVE_QUEUE_REQUIRED') return failure(res, 'Active queue registration is required before examination', 409);
  if (error instanceof Error && error.name === 'QueueConflict') return failure(res, error.message, 409);
  if (error instanceof SyntaxError && 'body' in error) return failure(res, 'Request body must be valid JSON', 400);
  console.error('API request failed:', error);
  return failure(res, 'Internal server error', 500);
};
