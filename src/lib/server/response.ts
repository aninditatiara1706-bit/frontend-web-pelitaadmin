import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function success<T>(data: T, message = 'Operation successful', status = 200, meta?: unknown) {
  return NextResponse.json({ success: true, message, data, ...(meta ? { meta } : {}) }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export function failure(message: string, status: number, details?: unknown) {
  return NextResponse.json({ success: false, message, ...(details ? { details } : {}) }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return failure('Validation failed', 400, error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return failure('Data conflicts with an existing record', 409);
    if (error.code === 'P2003') return failure('Related record was not found or is still in use', 409);
    if (error.code === 'P2025') return failure('Record not found', 404);
    if (error.code === 'P2034') return failure('Concurrent update conflict; retry the request', 409);
  }
  console.error('API request failed:', error);
  return failure('Internal server error', 500);
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ZodError([{ code: 'custom', path: [], message: 'Request body must be valid JSON' }]);
  }
}

export function paginationMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}


