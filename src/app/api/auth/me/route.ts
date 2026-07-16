import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('printing_auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const [userId] = token.split(':');
    if (userId !== 'website-admin-id' && userId !== 'website-admin-thanh' && userId !== 'website-marketing-id') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userId === 'website-admin-id' || userId === 'website-admin-thanh') {
      const isThanh = userId === 'website-admin-thanh';
      return NextResponse.json({
        user: {
          id: userId,
          name: isThanh ? 'Thanh' : 'Website Admin',
          email: isThanh ? 'thanh@prinktech.com' : 'admin@prinktech.com',
          role_id: 1,
          roles: { name: 'admin' },
          role: 'admin'
        }
      });
    } else {
      return NextResponse.json({
        user: {
          id: 'website-marketing-id',
          name: 'Marketing Specialist',
          email: 'marketing@prinktech.com',
          role_id: 2,
          roles: { name: 'marketing' },
          role: 'marketing'
        }
      });
    }
  } catch (error: any) {
    console.error('[API Auth Me Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
