import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Xóa cookie xác thực bằng cách đặt Max-Age = 0
  response.cookies.set('printing_auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
