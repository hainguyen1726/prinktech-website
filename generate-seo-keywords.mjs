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
  // Bài: So sánh in UV DTF nổi 3D vs UV phẳng
  'in tem uv dtf n\u1ed5i 3d': '/cam-nang/so-sanh-in-uv-dtf-noi-3d-va-in-uv-phang',
  'in tem n\u1ed5i uv dtf': '/cam-nang/so-sanh-in-uv-dtf-noi-3d-va-in-uv-phang',
  'sticker uv dtf n\u1ed5i 3d': '/cam-nang/so-sanh-in-uv-dtf-noi-3d-va-in-uv-phang',
  'in decal n\u1ed5i uv dtf': '/cam-nang/so-sanh-in-uv-dtf-noi-3d-va-in-uv-phang',

  // Bài: In UV DTF dán bình giữ nhiệt quà tặng doanh nghiệp
  'in tem uv dtf theo y\u00eau c\u1ea7u': '/cam-nang/in-uv-dtf-dan-binh-giu-nhiet-qua-tang-doanh-nghiep',
  'in tem nh\u00e3n uv dtf': '/cam-nang/in-uv-dtf-dan-binh-giu-nhiet-qua-tang-doanh-nghiep',
  'in tem nh\u00e3n decal uv dtf': '/cam-nang/in-uv-dtf-dan-binh-giu-nhiet-qua-tang-doanh-nghiep',
  'in logo tem d\u00e1n uv dtf': '/cam-nang/in-uv-dtf-dan-binh-giu-nhiet-qua-tang-doanh-nghiep',
  'in tem d\u00e1n uv dtf': '/cam-nang/in-uv-dtf-dan-binh-giu-nhiet-qua-tang-doanh-nghiep',

  // Bài: Tem UV DTF siêu bền ngoài trời
  'in tem uv dtf h\u00e0 n\u1ed9i': '/cam-nang/tem-uv-dtf-sieu-ben-ngoai-troi-do-ben-thoi-tiet',
  'in tem uv dtf tphcm': '/cam-nang/tem-uv-dtf-sieu-ben-ngoai-troi-do-ben-thoi-tiet',
  'in tem uv dtf h\u1ea3i ph\u00f2ng': '/cam-nang/tem-uv-dtf-sieu-ben-ngoai-troi-do-ben-thoi-tiet',
  'in tem uv dtf t\u1ea1i \u0111\u00e0 n\u1eb5ng': '/cam-nang/tem-uv-dtf-sieu-ben-ngoai-troi-do-ben-thoi-tiet',
  'in tem uv dtf \u0111\u00e0 n\u1eb5ng': '/cam-nang/tem-uv-dtf-sieu-ben-ngoai-troi-do-ben-thoi-tiet',
  'in tem uv dtf c\u1ea7n th\u01a1': '/cam-nang/tem-uv-dtf-sieu-ben-ngoai-troi-do-ben-thoi-tiet',

  // Bài: Mẹo thiết kế file in UV DTF chuẩn màu sắc nét
  'in tem uv dtf l\u00e0 g\u00ec': '/cam-nang/meo-thiet-ke-file-in-uv-dtf-chuan-mau-sac-net',
  'decal uv dtf l\u00e0 g\u00ec': '/cam-nang/meo-thiet-ke-file-in-uv-dtf-chuan-mau-sac-net',
  'in uv dtf l\u00e0 g\u00ec': '/cam-nang/meo-thiet-ke-file-in-uv-dtf-chuan-mau-sac-net',
  'decal uv dtf nh\u0169 v\u00e0ng': '/cam-nang/meo-thiet-ke-file-in-uv-dtf-chuan-mau-sac-net',
  'in tem uv dtf nh\u0169 v\u00e0ng': '/cam-nang/meo-thiet-ke-file-in-uv-dtf-chuan-mau-sac-net',

  // Bài: Hướng dẫn dán tem UV DTF đúng cách
  'c\u00e1ch in tem uv dtf': '/cam-nang/huong-dan-dan-tem-uv-dtf-dung-cach',
  'in decal uv dtf hcm': '/cam-nang/huong-dan-dan-tem-uv-dtf-dung-cach',
  'in decal uv dtf h\u00e0 n\u1ed9i': '/cam-nang/huong-dan-dan-tem-uv-dtf-dung-cach',

  // Bài: In sticker UV DTF theo yêu cầu lấy liền giá rẻ
  'in sticker uv dtf': '/cam-nang/in-sticker-uv-dtf-theo-yeu-cau-lay-lien-gia-re',
  'gi\u00e1 in decal uv dtf': '/cam-nang/in-sticker-uv-dtf-theo-yeu-cau-lay-lien-gia-re',
  'gi\u00e1 in tem uv dtf': '/cam-nang/in-sticker-uv-dtf-theo-yeu-cau-lay-lien-gia-re',
  'gi\u00e1 m\u00e1y in tem uv dtf': '/cam-nang/in-sticker-uv-dtf-theo-yeu-cau-lay-lien-gia-re',
  'in uv dtf gi\u00e1': '/cam-nang/in-sticker-uv-dtf-theo-yeu-cau-lay-lien-gia-re',
  'in uv dtf gi\u00e1 r\u1ebb': '/cam-nang/in-sticker-uv-dtf-theo-yeu-cau-lay-lien-gia-re',
  'in uv dtf gi\u00e1 t\u1ed1t': '/cam-nang/in-sticker-uv-dtf-theo-yeu-cau-lay-lien-gia-re',
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
