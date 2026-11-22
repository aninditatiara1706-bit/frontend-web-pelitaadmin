import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { prisma } from '../../../../lib/server/db';
import { createSessionToken, sessionCookieName, sessionCookieOptions } from '../../../../lib/server/auth';
import { handleApiError, failure, readJson, success } from '../../../../lib/server/response';
import { loginSchema } from '../../../../lib/server/validation';

export async function POST(request: NextRequest) {
  try {
    const input = loginSchema.parse(await readJson(request));
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return failure('Email or password is incorrect', 401);
    const token = await createSessionToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const response = success({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, 'Login successful');
    response.cookies.set(sessionCookieName, token, sessionCookieOptions);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
