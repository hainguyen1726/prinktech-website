import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' }, { status: 400 });
    }

    const inputUser = email.trim().toLowerCase();
    
    // Kiểm tra tài khoản admin website tĩnh độc lập
    if ((inputUser === 'admin' || inputUser === 'admin@prinktech.com') && password === 'WebxuongIn#Prink') {
      const userId = 'website-admin-id';
      const timestamp = Date.now();
      const tokenValue = `${userId}:${timestamp}`;

      const response = NextResponse.json({
        success: true,
        user: {
          id: userId,
          email: 'admin@prinktech.com',
          name: 'Website Admin',
          role: 'admin',
        },
      });

      // Cấu hình cookie an toàn (HttpOnly, Secure)
      response.cookies.set('printing_auth_token', tokenValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365 * 10, // 10 năm
        path: '/',
      });

      return response;
    }

    // Kiểm tra tài khoản marketing độc lập
    if ((inputUser === 'marketing' || inputUser === 'marketing@prinktech.com') && password === 'Marketing#Prink2026') {
      const userId = 'website-marketing-id';
      const timestamp = Date.now();
      const tokenValue = `${userId}:${timestamp}`;

      const response = NextResponse.json({
        success: true,
        user: {
          id: userId,
          email: 'marketing@prinktech.com',
          name: 'Marketing Specialist',
          role: 'marketing',
        },
      });

      // Cấu hình cookie an toàn (HttpOnly, Secure)
      response.cookies.set('printing_auth_token', tokenValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365 * 10, // 10 năm
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Tên đăng nhập hoặc mật khẩu không chính xác' },
      { status: 401 }
    );
  } catch (error) {
    console.error('[API Auth Login Error]', error);
    return NextResponse.json(
      { error: 'Lỗi máy chủ hệ thống. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
