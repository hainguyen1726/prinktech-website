import { chromium, type BrowserContext, type Page } from 'playwright'
import { promises as fs } from 'fs'
import path from 'path'

// ============================================================
// ⚙️ CẤU HÌNH HỆ THỐNG & ĐƯỜNG DẪN
// ============================================================
const OUTPUT_DIR = 'D:/16. Code/32-website-prinktech/public/images/posts'
const PROFILE_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\vbee-chrome-profile'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
// Project ID Google Flow cố định của xưởng để sinh ảnh
const FLOW_URL = 'https://labs.google/fx/tools/flow/project/406375de-f8bf-41a0-8b0a-f17e87763db4'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ============================================================
// 📝 DANH SÁCH 21 PROMPT CỦA 7 BÀI VIẾT HẸN GIỜ (ĐÃ TỐI ƯU THEO TIÊU CHUẨN THỰC TẾ)
// ============================================================
interface PostImagePrompt {
  filename: string;
  prompt: string;
}

const PROMPTS: PostImagePrompt[] = [
  // 1. in-logo-dan-mu-bao-hiem-chuyen-nghiep-gia-re
  {
    filename: 'in-logo-dan-mu-bao-hiem-chuyen-nghiep-gia-re-1.png',
    prompt: 'UV DTF printed logo on a glossy cream white motorcycle helmet side panel, realistic UV DTF print effect with a very thin and slightly raised profile, subtle sleek glossy varnish coating on each individual letter and symbol, color logo, no thick 3D extrusion, no background transparent film, no sticker border, flat sharp edges, close-up shot, sharp details, realistic reflections'
  },
  {
    filename: 'in-logo-dan-mu-bao-hiem-chuyen-nghiep-gia-re-2.png',
    prompt: 'Hands gently peeling off a transparent transfer film from a custom printed logo on a black motorcycle helmet, realistic UV DTF print effect, very thin paint film, close-up, sharp focus, workshop background'
  },
  {
    filename: 'in-logo-dan-mu-bao-hiem-chuyen-nghiep-gia-re-3.png',
    prompt: 'Multiple colorful custom branding logos printed directly on a matte gray plastic sheet, sharp details, glossy varnish coating on each letter, no border, no background, professional product photography'
  },

  // 2. cong-nghe-in-decal-3d-noi-khoi-doc-dao
  {
    filename: 'cong-nghe-in-decal-3d-noi-khoi-doc-dao-1.png',
    prompt: 'Corporate logo printed directly on a brushed silver metal surface, realistic UV DTF print effect with a very thin and slightly raised profile, subtle sleek glossy varnish coating on each individual letter and symbol, chrome silver and blue logo, no thick 3D extrusion, no background transparent film, no sticker border, flat sharp edges, low-profile tactile texture, close-up shot, sharp details'
  },
  {
    filename: 'cong-nghe-in-decal-3d-noi-khoi-doc-dao-2.png',
    prompt: 'Extreme close-up macro shot of a raised logo on a glass cup, showing the thin tactile ink layer and glossy varnish finish catching light, realistic reflections, sharp details, no sticker boundary'
  },
  {
    filename: 'cong-nghe-in-decal-3d-noi-khoi-doc-dao-3.png',
    prompt: 'Elegant brand logo printed directly on a polished dark walnut wood gift box, thin raised profile, glossy varnish coating, sharp details, premium product photography'
  },

  // 3. in-tem-noi-uv-dtf-phu-bong-varnish-cao-cap
  {
    filename: 'in-tem-noi-uv-dtf-phu-bong-varnish-cao-cap-1.png',
    prompt: 'Elegant corporate logo with glossy varnish finish printed directly on a matte black ceramic mug, varnish reflecting warm light, very thin raised profile, no background, close-up, sharp details'
  },
  {
    filename: 'in-tem-noi-uv-dtf-phu-bong-varnish-cao-cap-2.png',
    prompt: 'Macro shot of tactile gloss varnish print on a silver metal bottle, showing glossy and textured surface, thin raised profile, realistic reflections, high quality product photography'
  },
  {
    filename: 'in-tem-noi-uv-dtf-phu-bong-varnish-cao-cap-3.png',
    prompt: 'Luxury cosmetic logo printed directly on a transparent glass bottle, gloss varnish finish, gold foil details, no sticker background film, studio lighting, blurred background'
  },

  // 4. ung-dung-in-tem-nhan-decal-uv-dtf-doanh-nghiep
  {
    filename: 'ung-dung-in-tem-nhan-decal-uv-dtf-doanh-nghiep-1.png',
    prompt: 'Corporate branding logo printed directly on a premium dark brown leather notebook cover, thin raised profile, sleek varnish coating on letters, no background film, close-up shot, office table setting'
  },
  {
    filename: 'ung-dung-in-tem-nhan-decal-uv-dtf-doanh-nghiep-2.png',
    prompt: 'Branded gift set including a black metal thermos, a leather planner, and a pen, all having the same corporate logo printed directly on them, clean executive aesthetic, warm lighting, blurred office background'
  },
  {
    filename: 'ung-dung-in-tem-nhan-decal-uv-dtf-doanh-nghiep-3.png',
    prompt: 'Industrial brand logo printed directly on a brushed aluminum machine panel, thin raised paint layer, durable scratch-resistant texture, close-up shot, studio lighting'
  },

  // 5. so-sanh-decal-cat-dan-truyen-thong-va-tem-uv-dtf
  {
    filename: 'so-sanh-decal-cat-dan-truyen-thong-va-tem-uv-dtf-1.png',
    prompt: 'Comparison shot: on the left a paper sticker with visible plastic outline border on glass, on the right a clean logo printed directly on glass with no background film, close-up macro shot, sharp details'
  },
  {
    filename: 'so-sanh-decal-cat-dan-truyen-thong-va-tem-uv-dtf-2.png',
    prompt: 'Close-up of a vinyl cut letter sticker on a surface, showing the thick sticker edge, studio lighting'
  },
  {
    filename: 'so-sanh-decal-cat-dan-truyen-thong-va-tem-uv-dtf-3.png',
    prompt: 'Peeling off the clear plastic carrier film from a freshly applied UV DTF logo on a metal cup, leaving only the thin glossy letters on the surface, workshop background, sharp focus'
  },

  // 6. in-decal-7-mau-hologram-bat-sang-doc-dao
  {
    filename: 'in-decal-7-mau-hologram-bat-sang-doc-dao-1.png',
    prompt: 'Custom logo with holographic rainbow effect printed directly on a matte black helmet, metallic shifting colors, thin raised profile, glossy varnish, no sticker border, close-up shot, dynamic lighting'
  },
  {
    filename: 'in-decal-7-mau-hologram-bat-sang-doc-dao-2.png',
    prompt: 'A sheet of holographic metallic brand stickers reflecting rainbow colors under studio light, sharp details, glossy finish'
  },
  {
    filename: 'in-decal-7-mau-hologram-bat-sang-doc-dao-3.png',
    prompt: 'Holographic rainbow logo printed directly on the space gray aluminum laptop lid, shiny color-shifting letters, thin raised profile, close-up shot, modern coffee shop background'
  },

  // 7. gia-may-in-tem-uv-dtf-va-kinh-nghiem-dau-tu
  {
    filename: 'gia-may-in-tem-uv-dtf-va-kinh-nghiem-dau-tu-1.png',
    prompt: 'Close-up of a professional industrial UV DTF printer machine printing colorful designs on a roll of transparent film, glowing blue UV curing lamps, modern print shop workshop background, sharp details'
  },
  {
    filename: 'gia-may-in-tem-uv-dtf-va-kinh-nghiem-dau-tu-2.png',
    prompt: 'A roll of printed PET film containing multiple colorful logos, sitting on a workbench in a print shop, print head and gears visible in background, warm workshop lighting'
  },
  {
    filename: 'gia-may-in-tem-uv-dtf-va-kinh-nghiem-dau-tu-3.png',
    prompt: 'A print technician examining a roll of printed UV DTF film under bright light, checking colors and varnish thickness, print shop background, realistic photography'
  }
];

// ============================================================
// 🤖 FLOW BOT FUNCTIONS
// ============================================================

async function launchFlow(): Promise<{ context: BrowserContext; page: Page }> {
  console.log(`[FlowBot] Khởi động Chrome với Profile: ${PROFILE_DIR}`)
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    executablePath: CHROME_PATH,
    args: [
      '--disable-blink-features=AutomationControlled', 
      '--no-first-run', 
      '--no-default-browser-check',
      '--start-maximized'
    ],
    viewport: null,
  })

  const page = context.pages()[0] || await context.newPage()
  await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(8000)

  if (page.url().includes('accounts.google.com')) {
    console.error('❌ YÊU CẦU: Trình duyệt chưa đăng nhập Google. Vui lòng đăng nhập thủ công rồi chạy lại script.')
    await context.close()
    process.exit(1)
  }

  console.log('✓ Trình duyệt đã kết nối Google Flow')
  return { context, page }
}

async function ensureImageMode(page: Page) {
  try {
    const agentBtn = page.locator('button:has-text("Agent"), [role="button"]:has-text("Agent"), [aria-pressed]').filter({ hasText: 'Agent' }).first()
    if (await agentBtn.count() > 0) {
      const pressed = await agentBtn.getAttribute('aria-pressed')
      const checked = await agentBtn.getAttribute('aria-checked')
      const isPressed = pressed === 'true' || checked === 'true' || (await agentBtn.getAttribute('class'))?.includes('active')
      
      if (isPressed) {
        console.log('  [Mode] Phát hiện chế độ Agent đang bật. Tiến hành click tắt để chuyển sang Image Mode...')
        await agentBtn.click()
        await sleep(1500)
      }
    }
  } catch {}
}

async function getValidImageUrls(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[]
    return imgs
      .filter(img => {
        const r = img.getBoundingClientRect()
        const src = img.src || ''
        return r.width > 100 && r.height > 100 && img.complete && img.naturalWidth > 50 &&
          (src.includes('trpc') || src.includes('googleapis') || src.includes('blob:') ||
           src.includes('imagedelivery') || src.includes('googleusercontent'))
      })
      .map(img => img.src)
  })
}

async function setupEditor(page: Page, ratio: string): Promise<boolean> {
  try {
    // 1. Nếu đang ở Landing Page của Google Labs
    const createBtn = page.locator('button:has-text("Create with Google Flow")').first()
    if (await createBtn.count() > 0 && await createBtn.isVisible()) {
      await createBtn.click()
      await sleep(8000)
    }

    // 2. Không tạo project mới nếu đang ở trong project của người dùng
    if (page.url().endsWith('/flow') || page.url().endsWith('/flow/')) {
      const firstProject = page.locator('a[href*="/project/"], div[role="listitem"]').first()
      if (await firstProject.count() > 0) {
        await firstProject.click()
        await sleep(10000)
      }
    }

    // 3. ĐÓNG PANEL ALL MEDIA NẾU BỊ MỞ
    const backBtn = page.locator('button:has(span:text("arrow_back")), button:has(span:text("chevron_left")), button:has(span:text("arrow_left"))').first()
    if (await backBtn.count() > 0 && await backBtn.isVisible()) {
      console.log('  [Settings] Phát hiện panel Library/All Media đang mở. Tiến hành click đóng để giải phóng giao diện...')
      await backBtn.click()
      await sleep(2000)
    }

    // 4. Mở Model Settings bằng nút "tune" (icon 3 thanh gạt bên cạnh ô prompt)
    console.log(`  [Settings] Kiểm tra và cấu hình tỷ lệ: ${ratio}...`)
    const tuneBtn = page.locator('button:has(span:text("tune")), button:has(span:text("settings")), button[aria-label*="ettings"]').first()
    if (await tuneBtn.count() > 0 && await tuneBtn.isVisible()) {
      await tuneBtn.click()
      await sleep(2500)

      // Chọn model tốt nhất (Banana Pro hoặc Nano Banana Pro nếu có)
      const modelOptions = [
        page.locator('button:has-text("Banana Pro")').first(),
        page.locator('button:has-text("Nano Banana Pro")').first(),
        page.locator('button:has-text("Banana")').first(),
        page.locator('button:has-text("Nano Banana")').first(),
      ]

      for (const option of modelOptions) {
        if (await option.count() > 0 && await option.isVisible()) {
          const text = await option.innerText()
          if (!text.includes('active') && !text.includes('✓')) {
            console.log(`  → Click chọn model: ${text.trim()}`)
            await option.click()
            await sleep(1000)
          }
          break
        }
      }

      // Chọn tỷ lệ ảnh
      const ratioMap: Record<string, string[]> = { 
        PORTRAIT: ['9:16', 'Portrait', 'Vertical'], 
        LANDSCAPE: ['16:9', 'Landscape', 'Horizontal'], 
        SQUARE: ['1:1', 'Square'] 
      }
      const targetTexts = ratioMap[ratio] || ['1:1']
      let ratioClicked = false

      const ratioBtn = page.locator(`button[id$="-trigger-${ratio}"]`).first()
      if (await ratioBtn.count() > 0 && await ratioBtn.isVisible()) {
        await ratioBtn.click()
        ratioClicked = true
        await sleep(1000)
      } else {
        for (const text of targetTexts) {
          const textBtn = page.locator(`button:has-text("${text}")`).first()
          const spanBtn = page.locator(`button:has(span:has-text("${text}"))`).first()
          if (await textBtn.count() > 0 && await textBtn.isVisible()) {
            await textBtn.click()
            ratioClicked = true
            await sleep(1000)
            break
          } else if (await spanBtn.count() > 0 && await spanBtn.isVisible()) {
            await spanBtn.click()
            ratioClicked = true
            await sleep(1000)
            break
          }
        }
      }

      if (!ratioClicked) {
        console.log(`  ⚠ Không tìm thấy nút chọn tỷ lệ cho ${ratio}, giữ mặc định`)
      }

      // Chọn 1x ảnh để chạy nhanh
      const countBtn = page.locator('button[id$="-trigger-SINGLE"], button:has-text("1x")').first()
      if (await countBtn.count() > 0 && await countBtn.isVisible()) { 
        await countBtn.click()
        await sleep(1000) 
      }

      await page.keyboard.press('Escape')
      await sleep(1500)
    } else {
      // Fallback cho giao diện cũ nếu không thấy nút tune
      const modelBtn = page.locator('button:has-text("Nano Banana"), button:has-text("Banana"), button:has-text("Banana Pro"), button:has-text("Nano Banana Pro")').first()
      if (await modelBtn.count() > 0 && await modelBtn.isVisible()) {
        await modelBtn.click()
        await sleep(2000)
        
        const ratioMap: Record<string, string> = { PORTRAIT: '9:16', LANDSCAPE: '16:9', SQUARE: '1:1' }
        const targetRatioText = ratioMap[ratio] || '1:1'
        const textBtn = page.locator(`button:has-text("${targetRatioText}")`).first()
        if (await textBtn.count() > 0 && await textBtn.isVisible()) {
          await textBtn.click()
          await sleep(1000)
        }
        await page.keyboard.press('Escape')
        await sleep(1500)
      }
    }

    return true
  } catch (err: any) {
    console.error('  ✗ Lỗi cấu hình Editor:', err.message)
    return false
  }
}

async function generateImage(page: Page, prompt: string, ratio: string): Promise<boolean> {
  const ok = await setupEditor(page, ratio)
  if (!ok) return false

  await ensureImageMode(page)

  const promptSelectors = ['div[data-slate-editor="true"]', 'div[contenteditable="true"]', '[role="textbox"]', 'textarea']
  let promptEl: any = null
  for (const sel of promptSelectors) {
    const el = page.locator(sel).first()
    if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      promptEl = el
      break
    }
  }
  if (!promptEl) { 
    console.log('  ✗ Không tìm thấy ô nhập prompt')
    return false 
  }

  await promptEl.click()
  await page.keyboard.press('Control+A')
  await sleep(100)
  await page.keyboard.press('Backspace')
  await sleep(200)
  await page.keyboard.insertText(prompt)
  await sleep(800)

  // Bấm nút Generate (nút tròn có icon arrow_forward, east, hoặc send)
  const sendSelectors = [
    'button:has(span:text("arrow_forward"))',
    'button:has(span:text("east"))',
    'button:has(span:text("send"))',
    'button[type="submit"]:not([disabled])',
    'button:has-text("Create")',
  ]
  let clicked = false
  for (const sel of sendSelectors) {
    try {
      const btn = page.locator(sel).last()
      if (await btn.count() > 0 && !await btn.isDisabled()) {
        await btn.click({ force: true, timeout: 3000 })
        clicked = true
        break
      }
    } catch {}
  }
  if (!clicked) { 
    await promptEl.press('Enter')
    clicked = true 
  }

  return clicked
}

async function downloadImage(page: Page, savePath: string, oldUrls: string[], timeoutMs = 120000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  let lastLog = 0

  console.log('  [Download] Đang chờ ảnh mới sinh hoàn tất để download bản 2K gốc...')

  while (Date.now() < deadline) {
    await sleep(4000)

    // Lấy thông tin ảnh mới nhất trong DOM để di chuột
    const newImgData: any = await page.evaluate((excludeUrls) => {
      const excludeSet = new Set(excludeUrls)
      const candidates = (Array.from(document.querySelectorAll('img')) as HTMLImageElement[]).filter(img => {
        const r = img.getBoundingClientRect()
        const src = img.src || ''
        return r.width > 100 && r.height > 100 && img.complete && img.naturalWidth > 50 &&
          (src.includes('trpc') || src.includes('googleapis') || src.includes('blob:') ||
           src.includes('imagedelivery') || src.includes('googleusercontent')) &&
          !excludeSet.has(src)
      })
      if (candidates.length === 0) return null
      const img = candidates[candidates.length - 1]
      const r = img.getBoundingClientRect()
      return { src: img.src, x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }, oldUrls)

    if (newImgData) {
      console.log('  [Download] Phát hiện ảnh mới. Di chuột đến ảnh để hiện thanh công cụ...')
      try {
        const targetImg = page.locator(`img[src="${newImgData.src}"]`).first()
        if (await targetImg.count() > 0) {
          await targetImg.hover({ force: true })
          await sleep(1500)
        } else {
          await page.mouse.move(newImgData.x, newImgData.y)
          await sleep(1000)
        }

        const downloadSelectors = [
          'button:has(span:text("download"))',
          'button[aria-label*="ownload"]',
          'button[aria-label*="Download"]',
          'button:has(span:text("arrow_downward"))',
          'a[download]'
        ]

        let downloadBtn = null
        for (const sel of downloadSelectors) {
          const btn = page.locator(sel).last()
          if (await btn.count() > 0 && await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
            downloadBtn = btn
            break
          }
        }

        if (downloadBtn) {
          console.log('  [Download] Tìm thấy nút Download gốc. Tiến hành tải ảnh 2K chất lượng gốc...')
          const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
          await downloadBtn.click({ force: true })
          const download = await downloadPromise
          await fs.mkdir(path.dirname(savePath), { recursive: true })
          await download.saveAs(savePath)
          const { size } = await fs.stat(savePath)
          if (size > 20000) {
            console.log(`  ✓ Đã lưu ảnh 2K chất lượng gốc: ${path.basename(savePath)} (${Math.round(size/1024)}KB)`)
            return true
          }
        } else {
          console.log('  [Download] Không tìm thấy nút Download nổi trên ảnh. Thử click thẳng vào ảnh để mở panel...')
          const imgEl = page.locator(`img[src="${newImgData.src}"]`).first()
          if (await imgEl.count() > 0) {
            await imgEl.click()
            await sleep(2000)
            
            const panelDownloadBtn = page.locator('button:has-text("Download"), a:has-text("Download"), button[aria-label*="ownload"]').first()
            if (await panelDownloadBtn.count() > 0 && await panelDownloadBtn.isVisible()) {
              console.log('  [Download] Tìm thấy nút Download trong panel chi tiết. Tiến hành tải...')
              const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
              await panelDownloadBtn.click({ force: true })
              const download = await downloadPromise
              await fs.mkdir(path.dirname(savePath), { recursive: true })
              await download.saveAs(savePath)
              const { size } = await fs.stat(savePath)
              if (size > 20000) {
                console.log(`  ✓ Đã lưu ảnh 2K từ panel chi tiết: ${path.basename(savePath)} (${Math.round(size/1024)}KB)`)
                await page.keyboard.press('Escape')
                await sleep(1000)
                return true
              }
            }
            await page.keyboard.press('Escape')
            await sleep(1000)
          }
        }
      } catch (err: any) {
        console.log(`  ⚠ Lỗi tải ảnh 2K trực tiếp (${err.message}). Fallback về chế độ trích xuất canvas...`)
      }

      console.log('  [Download] Chạy chế độ Fallback Canvas...')
      const result: any = await page.evaluate((targetSrc) => {
        const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[]
        const img = imgs.find(i => i.src === targetSrc)
        if (!img) return { status: 'waiting' }
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || 1080
          canvas.height = img.naturalHeight || 1080
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0)
          const dataUrl = canvas.toDataURL('image/png')
          if (dataUrl === 'data:,' || dataUrl.length < 10000) return { status: 'waiting' }
          return { status: 'ok', dataUrl, w: img.naturalWidth, h: img.naturalHeight }
        } catch {
          return { status: 'cors', src: img.src }
        }
      }, newImgData.src)

      if (result.status === 'ok') {
        const base64 = result.dataUrl.split(',')[1]
        await fs.mkdir(path.dirname(savePath), { recursive: true })
        await fs.writeFile(savePath, Buffer.from(base64, 'base64'))
        const { size } = await fs.stat(savePath)
        if (size > 20000) {
          console.log(`  ✓ Đã lưu ảnh (Fallback Canvas): ${path.basename(savePath)} (${Math.round(size/1024)}KB, ${result.w}×${result.h})`)
          return true
        }
      }

      if (result.status === 'cors') {
        const blob = await page.evaluate(async (src: string) => {
          try { 
            return Array.from(new Uint8Array(await (await fetch(src)).arrayBuffer())) 
          } catch { 
            return null 
          }
        }, result.src)
        if (blob && blob.length > 20000) {
          await fs.mkdir(path.dirname(savePath), { recursive: true })
          await fs.writeFile(savePath, Buffer.from(blob))
          console.log(`  ✓ Đã lưu ảnh (Fallback CORS): ${path.basename(savePath)}`)
          return true
        }
      }
    }

    if (Date.now() - lastLog > 20000) {
      lastLog = Date.now()
      console.log(`  ... đang đợi ảnh mới tạo xong (${Math.round((Date.now() - (deadline - timeoutMs)) / 1000)}s)`)
    }
  }
  return false
}

// ============================================================
// 🚀 MAIN EXECUTION
// ============================================================
async function main() {
  console.log(`\n============================================================`)
  console.log(`BÀI VIẾT HẸN GIỜ MOCKUP GENERATOR — GOOGLE FLOW BOT (VBEE PROFILE)`)
  console.log(`Số lượng ảnh cần tạo: ${PROMPTS.length}`)
  console.log(`Thư mục lưu ảnh     : ${OUTPUT_DIR}`)
  console.log(`============================================================\n`)

  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const { context, page } = await launchFlow()
  
  let successCount = 0
  let skipCount = 0
  let failCount = 0

  for (let i = 0; i < PROMPTS.length; i++) {
    const p = PROMPTS[i]
    const savePath = path.join(OUTPUT_DIR, p.filename)

    console.log(`\n[${i + 1}/${PROMPTS.length}] Tiến hành: ${p.filename}`)
    console.log(`  - Prompt  : ${p.prompt.substring(0, 80)}...`)

    // Nếu đã có ảnh thực sự được sinh (size > 20KB) thì bỏ qua
    const exists = await fs.stat(savePath).then(s => s.size > 20000).catch(() => false)
    if (exists) {
      console.log(`  ✓ Ảnh đã tồn tại — Bỏ qua để tránh sinh trùng lặp`)
      skipCount++
      continue
    }

    // Lấy danh sách URL ảnh cũ trước khi generate
    const oldUrls = await getValidImageUrls(page)

    // Tạo ảnh
    const sent = await generateImage(page, p.prompt, 'LANDSCAPE')
    if (!sent) {
      console.log(`  ✗ Gặp lỗi khi gửi prompt lên Google Flow`)
      await page.screenshot({ path: path.join(OUTPUT_DIR, `_debug_fail_${p.filename}_${Date.now()}.png`) }).catch(() => {})
      failCount++
      continue
    }

    // Tải ảnh về
    const saved = await downloadImage(page, savePath, oldUrls)
    if (saved) {
      successCount++
    } else {
      console.log(`  ✗ Lỗi: Hết thời gian chờ tạo ảnh mới (Timeout 120s)`)
      await page.screenshot({ path: path.join(OUTPUT_DIR, `_debug_timeout_${p.filename}_${Date.now()}.png`) }).catch(() => {})
      failCount++
    }

    await sleep(3000)
  }

  console.log(`\n============================================================`)
  console.log(`BÁO CÁO KẾT QUẢ: Thành công: ${successCount} | Bỏ qua: ${skipCount} | Thất bại: ${failCount}`)
  console.log(`============================================================\n`)

  await context.close()
}

main().catch(console.error)
