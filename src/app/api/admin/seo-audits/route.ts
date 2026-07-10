import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrStaff } from '@/lib/adminAuth';
import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'src/data/seo-audits.json');

// Hàm helper để đọc dữ liệu từ file JSON
async function readAudits() {
  try {
    const fileContent = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    // Nếu file chưa tồn tại hoặc bị lỗi, trả về mảng rỗng
    return [];
  }
}

// Hàm helper để ghi dữ liệu vào file JSON
async function writeAudits(data: any) {
  // Tạo thư mục cha nếu chưa có (phòng hờ)
  const dir = path.dirname(DATA_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/admin/seo-audits - Lấy danh sách lịch sử audit
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const audits = await readAudits();
    return NextResponse.json({ audits });
  } catch (error: any) {
    console.error('[API SEO Audits GET Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// POST /api/admin/seo-audits - Tạo một phiên audit mới
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { targetUrl, score, summary, issues } = body;

    if (!targetUrl || score === undefined || !issues) {
      return NextResponse.json({ error: 'Thiếu thông tin phiên audit' }, { status: 400 });
    }

    const audits = await readAudits();

    const newAudit = {
      id: `audit-${Date.now()}`,
      createdAt: new Date().toISOString(),
      targetUrl,
      score: Number(score),
      summary: summary || '',
      issues: issues.map((issue: any, index: number) => ({
        id: issue.id || `issue-${Date.now()}-${index}`,
        severity: issue.severity || 'Warning',
        area: issue.area || 'Technical',
        title: issue.title || 'Lỗi chưa đặt tên',
        evidence: issue.evidence || '',
        recommendation: issue.recommendation || '',
        resolved: !!issue.resolved,
        resolvedAt: issue.resolved ? (issue.resolvedAt || new Date().toISOString()) : undefined
      }))
    };

    audits.unshift(newAudit); // Thêm vào đầu mảng
    await writeAudits(audits);

    return NextResponse.json({ success: true, audit: newAudit });
  } catch (error: any) {
    console.error('[API SEO Audits POST Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// PUT /api/admin/seo-audits - Cập nhật trạng thái hoàn thành của đề xuất
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { auditId, issueId, resolved } = body;

    if (!auditId || !issueId || resolved === undefined) {
      return NextResponse.json({ error: 'Thiếu thông tin cập nhật' }, { status: 400 });
    }

    const audits = await readAudits();
    const auditIndex = audits.findIndex((a: any) => a.id === auditId);

    if (auditIndex === -1) {
      return NextResponse.json({ error: 'Không tìm thấy phiên audit' }, { status: 404 });
    }

    const audit = audits[auditIndex];
    const issueIndex = audit.issues.findIndex((i: any) => i.id === issueId);

    if (issueIndex === -1) {
      return NextResponse.json({ error: 'Không tìm thấy đề xuất cần cập nhật' }, { status: 404 });
    }

    // Cập nhật trạng thái đề xuất
    audit.issues[issueIndex].resolved = resolved;
    audit.issues[issueIndex].resolvedAt = resolved ? new Date().toISOString() : undefined;

    // Tính toán lại điểm số SEO của phiên này dựa trên số lượng issue đã sửa
    // Công thức tính điểm:
    // Bắt đầu từ 100 điểm.
    // Lỗi Critical chưa resolved trừ 15 điểm.
    // Lỗi Warning chưa resolved trừ 5 điểm.
    // Điểm tối thiểu là 0.
    const unresCriticalCount = audit.issues.filter((i: any) => i.severity === 'Critical' && !i.resolved).length;
    const unresWarningCount = audit.issues.filter((i: any) => i.severity === 'Warning' && !i.resolved).length;
    audit.score = Math.max(0, 100 - (unresCriticalCount * 15 + unresWarningCount * 5));

    audits[auditIndex] = audit;
    await writeAudits(audits);

    return NextResponse.json({ success: true, audit });
  } catch (error: any) {
    console.error('[API SEO Audits PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
