import { NextRequest } from 'next/server';

export interface AdminAuthResult {
  user?: {
    id: string;
    name: string | null;
    email: string;
    role_id: number;
    roles?: {
      name: string;
    } | any;
  } | null;
  error?: string;
  status?: number;
}

export async function verifyAdminOrStaff(request: NextRequest): Promise<AdminAuthResult> {
  const token = request.cookies.get('printing_auth_token')?.value;
  if (!token) {
    return { error: 'Chưa đăng nhập. Vui lòng đăng nhập lại.', status: 401 };
  }
  
  const [userId] = token.split(':');
  if (userId !== 'website-admin-id' && userId !== 'website-admin-thanh') {
    return { error: 'Tài khoản không được cấp quyền truy cập chức năng này.', status: 403 };
  }

  const isThanh = userId === 'website-admin-thanh';

  return {
    user: {
      id: userId,
      name: isThanh ? 'Thanh' : 'Website Admin',
      email: isThanh ? 'thanh@prinktech.com' : 'admin@prinktech.com',
      role_id: 1,
      roles: { name: 'admin' }
    }
  };
}

export async function verifyAdminOrMarketing(request: NextRequest): Promise<AdminAuthResult> {
  const token = request.cookies.get('printing_auth_token')?.value;
  if (!token) {
    return { error: 'Chưa đăng nhập. Vui lòng đăng nhập lại.', status: 401 };
  }
  
  const [userId] = token.split(':');
  if (userId !== 'website-admin-id' && userId !== 'website-admin-thanh' && userId !== 'website-marketing-id') {
    return { error: 'Tài khoản không được cấp quyền truy cập chức năng này.', status: 403 };
  }

  if (userId === 'website-admin-id' || userId === 'website-admin-thanh') {
    const isThanh = userId === 'website-admin-thanh';
    return {
      user: {
        id: userId,
        name: isThanh ? 'Thanh' : 'Website Admin',
        email: isThanh ? 'thanh@prinktech.com' : 'admin@prinktech.com',
        role_id: 1,
        roles: { name: 'admin' }
      }
    };
  } else {
    return {
      user: {
        id: 'website-marketing-id',
        name: 'Marketing Specialist',
        email: 'marketing@prinktech.com',
        role_id: 2,
        roles: { name: 'marketing' }
      }
    };
  }
}
