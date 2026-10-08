import { NextFunction, Request, Response } from 'express';
import { jwtVerify, SignJWT } from 'jose';
import { Role } from '@prisma/client';
import { failure } from '../utils/response.js';

export type AuthUser = { id: string; email: string; name: string; role: Role };
declare global { namespace Express { interface Request { user?: AuthUser } } }
export const sessionCookieName = 'pelita_session';
const sessionDurationSeconds = 60 * 60 * 8;
function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters');
  return new TextEncoder().encode(secret);
}
export async function createToken(user: AuthUser) {
  return new SignJWT({ email: user.email, name: user.name, role: user.role }).setProtectedHeader({ alg: 'HS256' }).setSubject(user.id).setIssuedAt().setExpirationTime(`${sessionDurationSeconds}s`).sign(secretKey());
}
export const sessionCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: sessionDurationSeconds * 1000, path: '/' };
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authorization = req.get('authorization');
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  const token = req.cookies?.[sessionCookieName] ?? bearerToken;
  if (!token) return failure(res, 'Authentication required', 401);
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.email !== 'string' || typeof payload.name !== 'string' || (payload.role !== 'ADMIN' && payload.role !== 'KADER')) return failure(res, 'Invalid session', 401);
    req.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role as Role };
    return next();
  } catch (error) {
    if (error instanceof Error && error.message.includes('JWT_SECRET')) return next(error);
    return failure(res, 'Invalid or expired session', 401);
  }
}
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') return failure(res, 'Admin role required', 403);
  return next();
}
