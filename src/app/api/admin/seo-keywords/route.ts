import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrStaff } from '@/lib/adminAuth';
import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'src/data/seo-keywords.json');

// Danh sách từ khóa mặc định ban đầu
const DEFAULT_KEYWORDS = [
  {
    id: 'kw-1',
    keyword: 'in uv dtf nổi 3d',
    targetUrl: '/cam-nang/so-sanh-in-uv-dtf-noi-3d-va-in-uv-phang',
    targetRank: 1,
    currentRank: 100,
    prevRank: 100,
    searchVolume: 480,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'kw-2',
    keyword: 'in uv dtf bình giữ nhiệt',
    targetUrl: '/cam-nang/in-uv-dtf-dan-binh-giu-nhiet-qua-tang-doanh-nghiep',
    targetRank: 1,
    currentRank: 100,
    prevRank: 100,
    searchVolume: 320,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'kw-3',
    keyword: 'tem uv dtf ngoài trời',
    targetUrl: '/cam-nang/tem-uv-dtf-sieu-ben-ngoai-troi-do-ben-thoi-tiet',
    targetRank: 3,
    currentRank: 100,
    prevRank: 100,
    searchVolume: 210,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'kw-4',
    keyword: 'thiết kế file in uv dtf',
    targetUrl: '/cam-nang/meo-thiet-ke-file-in-uv-dtf-chuan-mau-sac-net',
    targetRank: 3,
    currentRank: 100,
    prevRank: 100,
    searchVolume: 140,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'kw-5',
    keyword: 'hướng dẫn dán tem uv dtf',
    targetUrl: '/cam-nang/huong-dan-dan-tem-uv-dtf-dung-cach',
    targetRank: 3,
    currentRank: 100,
    prevRank: 100,
    searchVolume: 180,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'kw-6',
    keyword: 'in sticker uv dtf',
    targetUrl: '/cam-nang/in-sticker-uv-dtf-theo-yeu-cau-lay-lien-gia-re',
    targetRank: 1,
    currentRank: 100,
    prevRank: 100,
    searchVolume: 1200,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    updatedAt: new Date().toISOString()
  }
];

// Helper để đọc danh sách từ khóa
async function readKeywords() {
  try {
    const fileContent = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    // Nếu file không tồn tại, tự tạo file với dữ liệu mặc định
    await writeKeywords(DEFAULT_KEYWORDS);
    return DEFAULT_KEYWORDS;
  }
}

// Helper để ghi danh sách từ khóa
async function writeKeywords(data: any) {
  const dir = path.dirname(DATA_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/admin/seo-keywords - Lấy danh sách từ khóa SEO
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keywords = await readKeywords();
    return NextResponse.json({ keywords });
  } catch (error: any) {
    console.error('[API SEO Keywords GET Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// POST /api/admin/seo-keywords - Thêm từ khóa mới
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { keyword, targetUrl, targetRank, currentRank, searchVolume, intent } = body;

    if (!keyword) {
      return NextResponse.json({ error: 'Từ khóa không được để trống' }, { status: 400 });
    }

    const keywords = await readKeywords();

    const newKeyword = {
      id: `kw-${Date.now()}`,
      keyword: keyword.trim(),
      targetUrl: targetUrl ? targetUrl.trim() : '',
      intent: intent || 'Commercial',
      targetRank: targetRank ? Number(targetRank) : 10,
      currentRank: currentRank ? Number(currentRank) : 100,
      prevRank: currentRank ? Number(currentRank) : 100,
      searchVolume: searchVolume ? Number(searchVolume) : 0,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      updatedAt: new Date().toISOString()
    };

    keywords.push(newKeyword);
    await writeKeywords(keywords);

    return NextResponse.json({ success: true, keyword: newKeyword });
  } catch (error: any) {
    console.error('[API SEO Keywords POST Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// PUT /api/admin/seo-keywords - Cập nhật thông tin từ khóa hoặc import hàng loạt
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    
    // Trường hợp 1: Nhập dữ liệu hàng loạt (Import GSC data)
    if (body.bulk && Array.isArray(body.keywords)) {
      const existingKeywords = await readKeywords();
      const updatedList = existingKeywords.map((existing: any) => {
        const importData = body.keywords.find(
          (item: any) => item.keyword.toLowerCase().trim() === existing.keyword.toLowerCase().trim()
        );
        if (importData) {
          return {
            ...existing,
            prevRank: existing.currentRank || 100,
            currentRank: importData.currentRank !== undefined ? Number(importData.currentRank) : existing.currentRank,
            clicks: importData.clicks !== undefined ? Number(importData.clicks) : existing.clicks,
            impressions: importData.impressions !== undefined ? Number(importData.impressions) : existing.impressions,
            ctr: importData.ctr !== undefined ? Number(importData.ctr) : existing.ctr,
            searchVolume: importData.searchVolume !== undefined ? Number(importData.searchVolume) : existing.searchVolume,
            updatedAt: new Date().toISOString()
          };
        }
        return existing;
      });

      await writeKeywords(updatedList);
      return NextResponse.json({ success: true, count: body.keywords.length });
    }

    // Trường hợp 2: Cập nhật một từ khóa đơn lẻ
    const { id, keyword, targetUrl, targetRank, currentRank, prevRank, searchVolume, clicks, impressions, ctr } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID từ khóa' }, { status: 400 });
    }

    const keywords = await readKeywords();
    const index = keywords.findIndex((kw: any) => kw.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Không tìm thấy từ khóa' }, { status: 404 });
    }

    const currentKwData = keywords[index];

    keywords[index] = {
      ...currentKwData,
      keyword: keyword !== undefined ? keyword.trim() : currentKwData.keyword,
      targetUrl: targetUrl !== undefined ? targetUrl.trim() : currentKwData.targetUrl,
      targetRank: targetRank !== undefined ? Number(targetRank) : currentKwData.targetRank,
      prevRank: currentRank !== undefined ? (currentKwData.currentRank || 100) : currentKwData.prevRank,
      currentRank: currentRank !== undefined ? Number(currentRank) : currentKwData.currentRank,
      searchVolume: searchVolume !== undefined ? Number(searchVolume) : currentKwData.searchVolume,
      clicks: clicks !== undefined ? Number(clicks) : currentKwData.clicks,
      impressions: impressions !== undefined ? Number(impressions) : currentKwData.impressions,
      ctr: ctr !== undefined ? Number(ctr) : currentKwData.ctr,
      updatedAt: new Date().toISOString()
    };

    await writeKeywords(keywords);
    return NextResponse.json({ success: true, keyword: keywords[index] });
  } catch (error: any) {
    console.error('[API SEO Keywords PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// DELETE /api/admin/seo-keywords - Xóa từ khóa
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID từ khóa' }, { status: 400 });
    }

    const keywords = await readKeywords();
    const filteredKeywords = keywords.filter((kw: any) => kw.id !== id);

    if (keywords.length === filteredKeywords.length) {
      return NextResponse.json({ error: 'Không tìm thấy từ khóa' }, { status: 404 });
    }

    await writeKeywords(filteredKeywords);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API SEO Keywords DELETE Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
