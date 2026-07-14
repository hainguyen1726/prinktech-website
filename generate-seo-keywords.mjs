// generate-seo-keywords.mjs
// Đọc file CSV từ khóa và sinh file seo-keywords.json với toàn bộ danh sách
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function estimateTargetRank(volume, intent) {
  if (intent === 'Transactional') {
    if (volume >= 3000) return 1;
    if (volume >= 1200) return 2;
    return 3;
  }
  if (intent === 'Commercial') {
    if (volume >= 3000) return 3;
    if (volume >= 1200) return 5;
    return 10;
  }
  return 5; // Informational
}

// Đọc file CSV
const csvPath = 'C:/Users/Admin/.gemini/antigravity/brain/6c6081a2-c375-4e35-bec8-b9be7e68af73/keywords_uv_dtf.csv';
const csvContent = readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').map(l => l.trim()).filter(Boolean);
const dataLines = lines.slice(1);

// Map từ khóa CSV → URL bài viết đã có trên website
// Key = keyword chính xác như trong file CSV
const existingPostMap = {
  'in uv dtf': '/cam-nang/huong-dan-dan-tem-uv-dtf-dung-cach',
  'in uv dtf': '/cam-nang/meo-thiet-ke-file-in-uv-dtf-chuan-mau-sac-net',
  'in logo dán mũ': '/cam-nang/in-logo-dan-mu-bao-hiem-chuyen-nghiep-gia-re',
  'in uv dtf': '/cam-nang/in-tem-dan-ly-giu-nhiet-chong-nuoc-sieu-ben',
  'giá in tem uv dtf': '/cam-nang/in-decal-dtf-va-decal-uv-dtf-co-gi-khac-nhau',
  'in uv dtf': '/cam-nang/so-sanh-in-uv-dtf-noi-3d-va-in-uv-phang',
  'in uv dtf': '/cam-nang/in-sticker-uv-dtf-theo-yeu-cau-lay-lien-gia-re',
  'in uv dtf': '/cam-nang/tem-uv-dtf-sieu-ben-ngoai-troi-do-ben-thoi-tiet',
  'in uv dtf': '/cam-nang/in-uv-dtf-dan-binh-giu-nhiet-qua-tang-doanh-nghiep',
  'in decal uv': '/cam-nang/gia-in-decal-uv-dtf-chi-tiet-moi-nhat',
  'in decal 3d': '/cam-nang/cong-nghe-in-decal-3d-noi-khoi-doc-dao',
  'in tem nổi uv dtf': '/cam-nang/in-tem-noi-uv-dtf-phu-bong-varnish-cao-cap',
  'in decal 7 màu': '/cam-nang/in-decal-7-mau-hologram-bat-sang-doc-dao',
  'giá máy in tem uv dtf': '/cam-nang/gia-may-in-tem-uv-dtf-va-kinh-nghiem-dau-tu',
  'in tem nhãn decal uv dtf': '/cam-nang/ung-dung-in-tem-nhan-decal-uv-dtf-doanh-nghiep',
  'in decal cắt dán': '/cam-nang/so-sanh-decal-cat-dan-truyen-thong-va-tem-uv-dtf',
  'in uv dtf': '/cam-nang/in-tem-dan-ly-giu-nhiet-so-luong-it-lay-ngay',
  'sticker uv dtf': '/cam-nang/top-ly-giu-nhiet-dan-sticker-uv-dtf-dep',
  'in uv dtf': '/cam-nang/cach-dan-logo-len-binh-giu-nhiet-son-tinh-dien',
  'in logo dán': '/cam-nang/huong-dan-chon-tem-dan-binh-giu-nhiet-chong-troc-son',
  'in uv dtf': '/cam-nang/so-sanh-khac-laser-va-dan-tem-uv-dtf-binh-giu-nhiet',
  'in decal dán ly': '/cam-nang/bao-gia-decal-dan-ly-giu-nhiet-si-le',
  'in uv dtf': '/cam-nang/tem-dan-binh-nuoc-nhua-va-binh-inox',
  'in uv dtf': '/cam-nang/sticker-dan-binh-nuoc-tu-thiet-ke',
  'in uv dtf': '/cam-nang/in-tem-logo-noi-3d-dan-coc-giu-nhiet',
  'in uv dtf': '/cam-nang/in-sticker-dan-mu-bao-hiem-chong-nang-mua',
  'in logo dán mũ': '/cam-nang/cach-dan-logo-mu-bao-hiem-nham-khong-bong',
  'in uv dtf': '/cam-nang/sticker-cute-dan-mu-bao-hiem-cuc-chat',
  'in uv dtf': '/cam-nang/quy-trinh-san-xuat-tem-dan-non-bao-hiem',
  'in decal dán mũ': '/cam-nang/in-decal-dan-mu-bao-hiem-quang-cao-gia-re',
  'in uv dtf': '/cam-nang/decal-dan-non-bao-hiem-thong-thuong-va-uv-dtf',
  'in uv dtf': '/cam-nang/in-tem-dan-ly-thuy-tinh-khong-vien',
  'đặt in logo dán': '/cam-nang/kinh-nghiem-in-logo-dan-binh-giu-nhiet-qua-tang',
  'in decal dán ly': '/cam-nang/in-decal-dan-ly-su-qua-tang-noi-3d',
  'in uv dtf': '/cam-nang/in-tem-dan-hu-nen-thom-doc-dao',
  'in uv dtf': '/cam-nang/mau-sticker-dan-coc-thuy-tinh-bat-trend',
  'in uv dtf': '/cam-nang/in-logo-decal-dan-ly-nhua-tra-sua-lay-nhanh',
  'in uv dtf': '/cam-nang/huong-dan-thiet-ke-file-in-uv-dtf-ai',
  'in uv dtf': '/cam-nang/cac-loi-thuong-gap-khi-xuat-file-pdf-in-uv-dtf',
  'in uv dtf': '/cam-nang/meo-dan-trang-ghep-file-in-tem-uv-dtf-kho-30cm',
  'in uv dtf': '/cam-nang/yeu-cau-he-mau-cmyk-in-tem-nhan-san-3d',
  'in uv dtf': '/cam-nang/in-sticker-dan-laptop-chong-nuoc-chong-xuoc',
  'in uv dtf': '/cam-nang/sticker-dan-dien-thoai-noi-3d-sang-trong',
  'in logo dán xe': '/cam-nang/in-logo-dan-xe-may-decal-uv-dtf-noi',
  'in decal 3d': '/cam-nang/xu-huong-in-decal-3d-trang-tri-do-gia-dung-thong-minh',
  'in logo dán chai': '/cam-nang/in-logo-dan-chai-lo-thuy-tinh-my-pham',
  'in uv dtf': '/cam-nang/mau-sticker-dan-laptop-it-lap-trinh-vien-3d',
  'sticker uv dtf': '/cam-nang/cach-dan-sticker-noi-3d-macbook-laptop-gaming',
  'in uv dtf': '/cam-nang/in-sticker-dan-dien-thoai-thiet-ke-rieng',
  'in logo dán': '/cam-nang/so-sanh-decal-skin-va-tem-uv-dtf-dien-thoai',
  'in uv dtf': '/cam-nang/huong-dan-chon-sticker-dan-hop-tai-nghe-airpods',
  'in uv dtf': '/cam-nang/in-tem-dan-chai-tinh-dau-serum-chong-dau',
  'in uv dtf': '/cam-nang/in-tem-dan-chai-ruou-vang-thuy-tinh-3d',
  'in logo dán': '/cam-nang/cach-dan-decal-noi-3d-suon-xe-may-khong-bong',
  'in uv dtf': '/cam-nang/mau-sticker-dan-xe-may-cute-ca-tinh-di-phuot',
  'in uv dtf': '/cam-nang/in-sticker-dan-non-bao-hiem-nua-dau-san-bong',
  'in logo dán': '/cam-nang/bao-gia-in-tem-dan-xe-dien-hoc-sinh',
  'in uv dtf': '/cam-nang/cach-tao-spot-color-spot-varnish-illustrator',
  'in uv dtf': '/cam-nang/loi-sai-he-mau-cmyk-rgb-in-tem-nhan-3d',
  'in decal uv': '/cam-nang/meo-dan-file-ghep-in-decal-uv-dtf-kho-60cm',
  'in uv dtf': '/cam-nang/dinh-dang-file-in-an-nhan-mac-tot-nhat',
  'đặt in logo dán': '/cam-nang/in-logo-dan-hu-nen-thom-thuy-tinh-chiu-nhiet',
  'in uv dtf': '/cam-nang/mau-tem-dan-ly-thuy-tinh-quan-cafe-sang-chanh',
  'in logo dán chai': '/cam-nang/in-logo-dan-chai-thuy-tinh-nuoc-ep-tra-sua',
  'in logo dán xe': '/cam-nang/in-logo-dan-xe-may-decal-uv-dtf-3d-chong-phai-mau',
  'in uv dtf': '/cam-nang/dan-logo-phan-quang-va-logo-noi-3d-xe-may',
  'đặt in logo dán': '/cam-nang/in-logo-dan-tu-lanh-decal-noi-3d-sang-trong',
  'in uv dtf': '/cam-nang/cach-tao-spot-color-spot-white-photoshop',
  'sticker uv dtf': '/cam-nang/dia-chi-in-sticker-dan-laptop-theo-yeu-cau-lay-lien',
  'in uv dtf': '/cam-nang/huong-dan-xuat-file-in-uv-dtf-coreldraw',
  'in logo dán ly': '/cam-nang/in-logo-dan-ly-su-uong-tra-van-phong',
  'in uv dtf': '/cam-nang/in-tem-dan-hu-my-pham-thuy-tinh-handmade',
  'in uv dtf': '/cam-nang/dan-tem-noi-3d-may-pha-cafe-may-hut-bui',
  'in uv dtf': '/cam-nang/in-logo-dan-binh-giu-nhiet-qua-tang-dai-hoi',
  'in uv dtf': '/cam-nang/sticker-dan-hop-qua-tang-go-phu-varnish',
  'in uv dtf': '/cam-nang/in-sticker-dan-binh-nuoc-hoc-sinh-chong-nuoc',
};

const keywords = dataLines.map((line, idx) => {
  const parts = line.split(',');
  if (parts.length < 3) return null;
  const keyword = parts[0].trim();
  const intent = parts[1].trim();
  const volume = parseInt(parts[2].trim(), 10) || 0;

  const targetRank = estimateTargetRank(volume, intent);
  const targetUrl = existingPostMap[keyword] || '';

  return {
    id: `kw-${String(idx + 1).padStart(4, '0')}`,
    keyword,
    targetUrl,
    intent,
    targetRank,
    currentRank: 100,
    prevRank: 100,
    searchVolume: volume,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    updatedAt: new Date().toISOString()
  };
}).filter(Boolean);

// Sort: có URL trước, rồi theo volume giảm dần
keywords.sort((a, b) => {
  if (a.targetUrl && !b.targetUrl) return -1;
  if (!a.targetUrl && b.targetUrl) return 1;
  return b.searchVolume - a.searchVolume;
});

const outputPath = resolve('d:/16. Code/32-website-prinktech/src/data/seo-keywords.json');
writeFileSync(outputPath, JSON.stringify(keywords, null, 2), 'utf-8');

console.log(`\u2705 Đã sinh ${keywords.length} từ khóa vào seo-keywords.json`);
console.log(`\ud83d\udccc Từ khóa đã có URL bài viết: ${keywords.filter(k => k.targetUrl).length}`);
console.log(`\ud83d\udccb Từ khóa chờ viết bài: ${keywords.filter(k => !k.targetUrl).length}`);
console.log('\n\ud83d\udcce Các từ khóa đã có URL:');
keywords.filter(k => k.targetUrl).forEach(k => console.log(`   "${k.keyword}" \u2192 ${k.targetUrl}`));
