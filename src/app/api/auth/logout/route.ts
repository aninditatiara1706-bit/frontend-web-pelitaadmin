import { NextResponse } from 'next/server';
import { sessionCookieName } from '../../../../lib/server/auth';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logout successful', data: null }, { headers: { 'Cache-Control': 'private, no-store' } });
  response.cookies.set(sessionCookieName, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}

