import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { Role } from '@prisma/client';

export const sessionCookieName = 'pelita_session';
const sessionDurationSeconds = 60 * 60 * 8;

type SessionUser = { id: string; email: string; name: string; role: Role };

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters');
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${sessionDurationSeconds}s`)
    .sign(secretKey());
}

export async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.email !== 'string' || typeof payload.name !== 'string' || (payload.role !== 'ADMIN' && payload.role !== 'KADER')) return null;
    return { id: payload.sub, email: payload.email, name: payload.name, role: payload.role as Role };
  } catch (error) {
    if (error instanceof Error && error.message.includes('JWT_SECRET')) throw error;
    return null;
  }
}

export async function requireUser(roles?: Role[]) {
  const user = await currentUser();
  if (!user) return { user: null, response: Response.json({ success: false, message: 'Authentication required' }, { status: 401 }) };
  if (roles && !roles.includes(user.role)) return { user: null, response: Response.json({ success: false, message: 'Insufficient permissions' }, { status: 403 }) };
  return { user, response: null };
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: sessionDurationSeconds,
};
