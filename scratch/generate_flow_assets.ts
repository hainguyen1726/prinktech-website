import { chromium, type BrowserContext, type Page } from 'playwright'
import { promises as fs } from 'fs'
import path from 'path'

// Config
const PROFILE_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\vbee-chrome-profile'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const FLOW_URL = 'https://labs.google/fx/tools/flow'

const BRAND_STICKERS_DIR = 'D:\\16. Code\\32-website-prinktech\\images_brand_raw'
const BACKGROUNDS_DIR = 'D:\\16. Code\\32-website-prinktech\\images_backgrounds_raw'
const SCRATCH_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\dd9cf28d-3732-41c5-8ac1-17a6502b4fa6\\scratch'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// Danh sach prompt Sticker cho cac brand (nền trắng đơn sắc để tách nền tối ưu)
const BRAND_PROMPTS = [
  // 1. Ngan hang (Finance/Banking)
  { label: 'bank_heo_dat', prompt: 'A premium vector sticker of a cute golden piggy bank with shiny gold coins, 3D render style, isolated on solid white background, die-cut outline, high resolution, 1024x1024' },
  { label: 'bank_the_tin_dung', prompt: 'A premium vector sticker of a modern credit card with holographic chip and gold coin, isolated on solid white background, die-cut outline, 1024x1024' },
  { label: 'bank_bieu_do_tang_truong', prompt: 'A premium vector sticker of a gold coin with upward growth chart green arrow, isolated on solid white background, die-cut outline, 1024x1024' },
  
  // 2. Cafe (Coffee Shop)
  { label: 'cafe_ly_latte', prompt: 'A premium vector sticker of a hot coffee mug with beautiful latte art heart, cozy cafe vibe, isolated on solid white background, die-cut outline, 1024x1024' },
  { label: 'cafe_may_pha', prompt: 'A premium vector sticker of a vintage espresso machine with coffee beans floating around, isolated on solid white background, die-cut outline, 1024x1024' },
  { label: 'cafe_hat_tui', prompt: 'A premium vector sticker of a cute craft paper bag of coffee beans, isolated on solid white background, die-cut outline, 1024x1024' },
  
  // 3. Dien tu (Electronics)
  { label: 'elec_tay_cam_game', prompt: 'A premium vector sticker of a futuristic gaming console controller with neon glowing lines, cyberpunk style, isolated on solid white background, die-cut outline, 1024x1024' },
  { label: 'elec_robot_chibi', prompt: 'A premium vector sticker of a cute smart robot head waving hand, high tech, isolated on solid white background, die-cut outline, 1024x1024' },
  { label: 'elec_chip_vong_tay', prompt: 'A premium vector sticker of a gold microchip with green circuit board lines, isolated on solid white background, die-cut outline, 1024x1024' },
  
  // 4. Gia dung (Household)
  { label: 'house_binh_hoa', prompt: 'A premium vector sticker of a minimalist aesthetic flower pot with green monstera leaf, isolated on solid white background, die-cut outline, 1024x1024' },
  { label: 'house_den_ngu', prompt: 'A premium vector sticker of a modern minimalist desk lamp emitting soft warm light, isolated on solid white background, die-cut outline, 1024x1024' },
  { label: 'house_am_tra', prompt: 'A premium vector sticker of a cute ceramic teapot with steam, cozy home, isolated on solid white background, die-cut outline, 1024x1024' }
]

// Danh sach prompt Boi canh Mockup (Backgrounds)
const BACKGROUND_PROMPTS = [
  // 1. Ly coc (Mugs / Cups)
  { label: 'bg_cup_cafe', prompt: 'A close-up photo of a blank white ceramic mug standing on a rustic wooden table in a sunlit coffee shop, cozy cafe background, photorealistic, 1024x1024' },
  { label: 'bg_cup_studio', prompt: 'A close-up photo of a blank clear glass cup standing on a minimalist marble table, clean studio lighting, photorealistic, 1024x1024' },
  
  // 2. Binh nuoc (Thermos / Bottles)
  { label: 'bg_bottle_vanphong', prompt: 'A close-up photo of a blank stainless steel thermos water bottle standing on an office desk, blurry keyboard and plant in background, photorealistic, 1024x1024' },
  { label: 'bg_bottle_camtrai', prompt: 'A close-up photo of a blank white metal water bottle standing on a wooden table at a camp site, pine forest background, photorealistic, 1024x1024' },
  
  // 3. Laptop (Laptop cover)
  { label: 'bg_laptop_lamviec', prompt: 'A close-up photo of a blank metallic laptop lid closed, sitting on a modern minimalist desk, cozy workspace background, photorealistic, 1024x1024' },
  { label: 'bg_laptop_cafe', prompt: 'A close-up photo of a blank space gray laptop cover closed, sitting on a wooden table in a busy coffee shop, photorealistic, 1024x1024' },
  
  // 4. Ba lo (Backpacks)
  { label: 'bg_backpack_congvien', prompt: 'A close-up photo of a blank canvas fabric backpack sitting on a park bench, textured canvas material, bright natural daylight, photorealistic, 1024x1024' },
  { label: 'bg_backpack_studio', prompt: 'A close-up photo of a blank modern nylon backpack standing on a white floor, minimalist shadow, photorealistic, 1024x1024' },
  
  // 5. Oto (Car doors / window)
  { label: 'bg_car_cua', prompt: 'A close-up photo of a clean blank car door panel of a white modern sedan, glossy paint finish with subtle reflections, photorealistic, 1024x1024' },
  
  // 6. Xe dap (Bicycle frame)
  { label: 'bg_bike_suon', prompt: 'A close-up photo of a blank steel bicycle frame tube, parked on a city street, sunlit asphalt background, photorealistic, 1024x1024' },
  
  // 7. But (Pens)
  { label: 'bg_pen_so', prompt: 'A close-up photo of a luxury blank matte black metal fountain pen lying on an open leather notebook, wooden desk, photorealistic, 1024x1024' },
  
  // 8. Pha le (Crystal souvenir)
  { label: 'bg_crystal_trophy', prompt: 'A close-up photo of a blank clear hexagonal crystal award trophy standing on a premium velvet presentation box, light refractions, photorealistic, 1024x1024' }
]

async function launchFlowBot(): Promise<{ context: BrowserContext; page: Page }> {
  const chromeExe = require('fs').existsSync(CHROME_PATH) ? CHROME_PATH : undefined
  console.log(`[BOT] Khoi dong Chrome Persistent Context...`)

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    executablePath: chromeExe,
    args: ['--disable-blink-features=AutomationControlled', '--no-first-run', '--no-default-browser-check'],
    viewport: { width: 1366, height: 900 },
  })

  const page = context.pages()[0] || await context.newPage()
  await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await sleep(8000)

  if (page.url().includes('accounts.google.com')) {
    console.error('❌ [BOT] Chua dang nhap Google. Vui long dang nhap tren cua so Chrome roi chay lai.')
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'err_no_login.png') })
    await context.close()
    process.exit(1)
  }

  console.log('✓ [BOT] Da vao Google Flow.')
  return { context, page }
}

async function ensureImageMode(page: Page) {
  try {
    const agentBtn = page.locator('[aria-pressed]').filter({ hasText: 'Agent' }).first()
    if (await agentBtn.count() > 0 && await agentBtn.getAttribute('aria-pressed') === 'true') {
      await agentBtn.click()
      await sleep(1500)
    }
  } catch {}
}

async function setupModelSettings(page: Page): Promise<boolean> {
  try {
    // Click button mo project moi neu dang o Home
    const url = page.url()
    if (url.endsWith('/flow') || url.endsWith('/flow/')) {
      const newBtn = page.locator('text=New project').first()
      if (await newBtn.count() > 0) {
        await newBtn.click({ force: true })
        await sleep(8000)
      } else {
        const addBtn = page.locator('button:has(span:text("add_2"))').first()
        if (await addBtn.count() > 0) {
          await addBtn.click({ force: true })
          await sleep(8000)
        }
      }
    }

    // Tim nut Model de cau hinh
    const modelBtnSelectors = [
      'button:has-text("Nano Banana")',
      'button:has-text("Banana")',
      'button:has-text("Imagen")',
      'button:has-text("Quality")',
      'button:has-text("Fast")',
      'button:has(span:text("settings"))'
    ]
    
    let modelBtn = null
    for (const sel of modelBtnSelectors) {
      const btn = page.locator(sel).first()
      if (await btn.count() > 0 && await btn.isVisible()) {
        modelBtn = btn; break
      }
    }

    if (modelBtn) {
      await modelBtn.click()
      await sleep(2000)

      // Chon ratio SQUARE (1:1) neu co
      const ratioBtn = page.locator('button[id$="-trigger-SQUARE"], button[aria-label*="SQUARE"]').first()
      if (await ratioBtn.count() > 0) { await ratioBtn.click(); await sleep(1000) }
      
      // Chon SINGLE 1x
      const countBtn = page.locator('button[id$="-trigger-SINGLE"], button[aria-label*="SINGLE"]').first()
      if (await countBtn.count() > 0) { await countBtn.click(); await sleep(1000) }

      // Escape de dong settings
      await page.keyboard.press('Escape')
      await sleep(1500)
      return true
    }
    return false
  } catch (err: any) {
    return false
  }
}

async function generateAndDownload(page: Page, prompt: string, savePath: string): Promise<boolean> {
  // BIEU DIEN TUONG TAC SACH 100%: reload trang truoc moi prompt de trang hoan toan trong tron!
  console.log(`    [BOT] Dang lam sach moi truong (reload page)...`)
  await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await sleep(8000)
  
  await ensureImageMode(page)
  await setupModelSettings(page)

  // Nhap prompt
  const promptSelectors = ['div[data-slate-editor="true"]', 'div[contenteditable="true"]', '[role="textbox"]', 'textarea']
  let promptEl: any = null
  for (const sel of promptSelectors) {
    const el = page.locator(sel).first()
    if (await el.count() > 0 && await el.isVisible()) {
      promptEl = el; break
    }
  }
  if (!promptEl) {
    console.error('    ❌ [BOT] Khong tim thay o nhap prompt.')
    return false
  }

  // Click va type chu dong
  await promptEl.focus()
  await page.keyboard.press('Control+A'); await sleep(100)
  await page.keyboard.press('Delete'); await sleep(300)
  await page.keyboard.type(prompt, { delay: 15 })
  await sleep(800)

  // Click submit
  const sendSelectors = [
    'button:has(span:text("arrow_forward"))',
    'button:has-text("Create")',
    'button[aria-label*="enerate"]',
    'button[aria-label*="end"]',
    'button:has(span:text("send"))',
    'button[type="submit"]:not([disabled])',
  ]
  let clicked = false
  for (const sel of sendSelectors) {
    try {
      const btn = page.locator(sel).last()
      if (await btn.count() > 0 && !await btn.isDisabled()) {
        await btn.click({ force: true, timeout: 3000 })
        clicked = true; break
      }
    } catch {}
  }
  if (!clicked) { await promptEl.press('Enter') }

  console.log(`    [BOT] Cho sinh anh...`)
  
  // Cho va download anh tai day (do trang da duoc reload, bat ky anh nao xuat hien deu la anh cua prompt nay!)
  const deadline = Date.now() + 100000 // 100s timeout
  while (Date.now() < deadline) {
    await sleep(4000)
    
    const result: any = await page.evaluate(() => {
      // Lay danh sach tat ca anh hop le tren trang
      const images = Array.from(document.querySelectorAll('img')).filter(img => {
        const r = img.getBoundingClientRect()
        const src = img.src || ''
        return r.width > 120 && r.height > 120 && img.complete && img.naturalWidth > 100 &&
          (src.includes('trpc') || src.includes('googleapis') || src.includes('blob:') ||
           src.includes('imagedelivery') || src.includes('googleusercontent'))
      })
      if (images.length === 0) return { status: 'waiting' }
      
      // Trang web moi chi co 1 project va cac anh sinh ra
      const lastImg = images[images.length - 1]
      try {
        const canvas = document.createElement('canvas')
        canvas.width = lastImg.naturalWidth; canvas.height = lastImg.naturalHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(lastImg, 0, 0)
        return { status: 'ok', dataUrl: canvas.toDataURL('image/png'), w: lastImg.naturalWidth, h: lastImg.naturalHeight }
      } catch {
        return { status: 'cors', src: lastImg.src }
      }
    })

    if (result.status === 'ok') {
      const base64 = result.dataUrl.split(',')[1]
      await fs.mkdir(path.dirname(savePath), { recursive: true })
      await fs.writeFile(savePath, Buffer.from(base64, 'base64'))
      console.log(`    ✓ [BOT] Tai ve thanh cong: ${path.basename(savePath)} (${result.w}x${result.h})`)
      return true
    }

    if (result.status === 'cors') {
      const blob = await page.evaluate(async (src: string) => {
        try { return Array.from(new Uint8Array(await (await fetch(src)).arrayBuffer())) } catch { return null }
      }, result.src)
      if (blob && blob.length > 20000) {
        await fs.mkdir(path.dirname(savePath), { recursive: true })
        await fs.writeFile(savePath, Buffer.from(blob))
        console.log(`    ✓ [BOT] Tai ve thanh cong (qua fetch): ${path.basename(savePath)}`)
        return true
      }
    }
  }

  console.error(`    ❌ [BOT] Timeout khi sinh anh. Chup hinh debug...`)
  await page.screenshot({ path: path.join(SCRATCH_DIR, `err_timeout_${path.basename(savePath)}.png`) })
  return false
}

async function main() {
  console.log('[BOT] BAT DAU TOC HANH GOOGLE FLOW GENERATOR...')
  
  // Xoa cac file anh cu trong raw de tai lai sach se 100%
  const cleanDir = async (dirPath: string) => {
    try {
      const files = await fs.readdir(dirPath)
      for (const f of files) {
        await fs.unlink(path.join(dirPath, f))
      }
    } catch {}
  }
  await cleanDir(BRAND_STICKERS_DIR)
  await cleanDir(BACKGROUNDS_DIR)
  
  const { context, page } = await launchFlowBot()

  // 1. Sinh Sticker các Brand
  console.log('\n[BOT] ==================================================')
  console.log('[BOT] 1. TIEN HANH SINH STICKER BRAND')
  console.log('[BOT] ==================================================')
  for (let i = 0; i < BRAND_PROMPTS.length; i++) {
    const item = BRAND_PROMPTS[i]
    const savePath = path.join(BRAND_STICKERS_DIR, `${item.label}.png`)
    
    console.log(`  [BOT] [${i+1}/${BRAND_PROMPTS.length}] Dang sinh: ${item.label}...`)
    await generateAndDownload(page, item.prompt, savePath)
    await sleep(3000)
  }

  // 2. Sinh Boi canh Mockup
  console.log('\n[BOT] ==================================================')
  console.log('[BOT] 2. TIEN HANH SINH BOI CANH MOCKUP')
  console.log('[BOT] ==================================================')
  for (let i = 0; i < BACKGROUND_PROMPTS.length; i++) {
    const item = BACKGROUND_PROMPTS[i]
    const savePath = path.join(BACKGROUNDS_DIR, `${item.label}.png`)

    console.log(`  [BOT] [${i+1}/${BACKGROUND_PROMPTS.length}] Dang sinh: ${item.label}...`)
    await generateAndDownload(page, item.prompt, savePath)
    await sleep(3000)
  }

  console.log('\n[BOT] ==================================================')
  console.log('[BOT] HOAN THANH SINH ANH TU GOOGLE FLOW!')
  console.log('[BOT] ==================================================')
  await context.close()
}

main().catch(console.error)
