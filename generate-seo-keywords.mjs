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
  'cách in tem uv dtf': '/cam-nang/cach-dan-logo-len-binh-giu-nhiet-son-tinh-dien',
  'in decal 3d': '/cam-nang/xu-huong-in-decal-3d-trang-tri-do-gia-dung-thong-minh',
  'in decal 7 mau': '/cam-nang/in-decal-7-mau-hologram-bat-sang-doc-dao',
  'in decal bóc dán': '/cam-nang/dich-vu-in-decal-boc-dan-lay-ngay-gia-re',
  'in decal chữ dán xe': '/cam-nang/in-decal-chu-dan-xe-lay-ngay',
  'in decal cắt dán': '/cam-nang/so-sanh-decal-cat-dan-truyen-thong-va-tem-uv-dtf',
  'in decal dán bao bì': '/cam-nang/in-tem-dan-chai-tinh-dau-serum-chong-dau',
  'in decal dán bình dương': '/cam-nang/huong-dan-chon-tem-dan-binh-giu-nhiet-chong-troc-son',
  'in decal dán bình thạnh': '/cam-nang/in-logo-dan-binh-giu-nhiet-qua-tang-dai-hoi',
  'in decal dán cốc': '/cam-nang/dia-chi-in-decal-dan-coc-gia-re',
  'in decal dán ly thuỷ tinh': '/cam-nang/in-decal-dan-ly-thuy-tinh-cao-cap',
  'in decal dán ly trà sữa': '/cam-nang/in-logo-dan-chai-thuy-tinh-nuoc-ep-tra-sua',
  'in decal dán mũ bảo hiểm': '/cam-nang/in-logo-dan-xe-may-decal-uv-dtf-noi',
  'in decal dán mũ bảo hộ': '/cam-nang/in-decal-dan-mu-bao-ho-cong-trinh',
  'in decal dán nha trang': '/cam-nang/cach-tao-spot-color-spot-white-photoshop',
  'in decal dán nhiệt': '/cam-nang/kinh-nghiem-in-logo-dan-binh-giu-nhiet-qua-tang',
  'in decal dán nhãn': '/cam-nang/sticker-dan-binh-nuoc-tu-thiet-ke',
  'in decal dán nón bảo hiểm': '/cam-nang/in-decal-dan-non-bao-hiem-doc-dao',
  'in decal dán nền': '/cam-nang/in-tem-dan-hu-nen-thom-doc-dao',
  'in decal dán quảng cáo': '/cam-nang/in-tem-dan-chai-ruou-vang-thuy-tinh-3d',
  'in decal dán sản phẩm': '/cam-nang/in-logo-dan-chai-lo-thuy-tinh-my-pham',
  'in decal dán tân phú': '/cam-nang/cach-tao-spot-color-spot-varnish-illustrator',
  'in decal dán xe bán hàng': '/cam-nang/mau-sticker-dan-xe-may-cute-ca-tinh-di-phuot',
  'in decal dán xe máy': '/cam-nang/in-logo-dan-xe-may-decal-uv-dtf-3d-chong-phai-mau',
  'in decal dán đà nẵng': '/cam-nang/in-tem-dan-hu-my-pham-thuy-tinh-handmade',
  'in decal ly': '/cam-nang/mau-tem-dan-ly-thuy-tinh-quan-cafe-sang-chanh',
  'in decal lên gỗ': '/cam-nang/huong-dan-in-decal-len-go-ben-dep',
  'in decal lẻ': '/cam-nang/bao-gia-in-tem-dan-xe-dien-hoc-sinh',
  'in decal màu dán': '/cam-nang/mau-sticker-dan-laptop-it-lap-trinh-vien-3d',
  'in decal mờ': '/cam-nang/cach-dan-logo-mu-bao-hiem-nham-khong-bong',
  'in decal rẻ': '/cam-nang/yeu-cau-he-mau-cmyk-in-tem-nhan-san-3d',
  'in decal trong dán ly': '/cam-nang/in-decal-trong-dan-ly-nhua-thuy-tinh',
  'in decal uv': '/cam-nang/gia-may-in-tem-uv-dtf-va-kinh-nghiem-dau-tu',
  'in decal uv dán': '/cam-nang/meo-dan-file-ghep-in-decal-uv-dtf-kho-60cm',
  'in decal uv trong': '/cam-nang/loi-sai-he-mau-cmyk-rgb-in-tem-nhan-3d',
  'in decal và dán': '/cam-nang/tem-dan-binh-nuoc-nhua-va-binh-inox',
  'in dán tủ lạnh': '/cam-nang/in-logo-dan-tu-lanh-decal-noi-3d-sang-trong',
  'in logo công ty dán': '/cam-nang/in-logo-cong-ty-dan-nhan-dien-thuong-hieu',
  'in logo dán giá rẻ': '/cam-nang/quy-trinh-san-xuat-tem-dan-non-bao-hiem',
  'in logo tem dán uv': '/cam-nang/in-logo-tem-dan-uv-noi-3d-lay-lien',
  'in logo uv dán': '/cam-nang/meo-dan-trang-ghep-file-in-tem-uv-dtf-kho-30cm',
  'in sticker theo yeu cau': '/cam-nang/huong-dan-chon-sticker-dan-hop-tai-nghe-airpods',
  'in tem uv đà nẵng': '/cam-nang/tem-uv-dtf-sieu-ben-ngoai-troi-do-ben-thoi-tiet',
  'in uv dtf': '/cam-nang/so-sanh-in-uv-dtf-noi-3d-va-in-uv-phang',
  'in uv dtf giá': '/cam-nang/in-tem-noi-uv-dtf-phu-bong-varnish-cao-cap',
  'in uv dtf giá rẻ': '/cam-nang/ung-dung-in-tem-nhan-decal-uv-dtf-doanh-nghiep',
  'in uv dtf là gì': '/cam-nang/so-sanh-khac-laser-va-dan-tem-uv-dtf-binh-giu-nhiet',
  'in ấn logo dán': '/cam-nang/sticker-dan-hop-qua-tang-go-phu-varnish',
  'sticker uv dtf': '/cam-nang/top-ly-giu-nhiet-dan-sticker-uv-dtf-dep',
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
