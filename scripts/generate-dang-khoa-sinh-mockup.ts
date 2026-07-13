import { chromium, type BrowserContext, type Page } from 'playwright'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { spawn } from 'child_process'

const PROFILE_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\vbee-chrome-profile'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const FLOW_URL = 'https://labs.google/fx/tools/flow/project/406375de-f8bf-41a0-8b0a-f17e87763db4'

const SAVE_PATH = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\0f3e6447-4925-4758-bf79-c03b5face643\\wood_texture_background_1783946768113.png'
const DEBUG_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\0f3e6447-4925-4758-bf79-c03b5face643'

const EMAIL = 'johnhuh786@gmail.com'
const PASSWORD = 'Chiuthoi@12'
const TWO_FA_SECRET = 'gzx2 xfqu uuho lhgi kh35 vk3d hjwq lut6'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function generateTOTP(secret: string): string {
  const cleanSecret = secret.replace(/\s+/g, '').toUpperCase()
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (let i = 0; i < cleanSecret.length; i++) {
    const val = base32chars.indexOf(cleanSecret.charAt(i))
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2))
  }
  const key = Buffer.from(bytes)
  
  const epoch = Math.round(Date.now() / 1000)
  const counter = Math.floor(epoch / 30)
  
  const buffer = Buffer.alloc(8)
  buffer.writeBigInt64BE(BigInt(counter))
  
  const hmac = crypto.createHmac('sha1', key)
  hmac.update(buffer)
  const hmacResult = hmac.digest()
  
  const offset = hmacResult[hmacResult.length - 1] & 0xf
  const code = ((hmacResult[offset] & 0x7f) << 24) |
               ((hmacResult[offset + 1] & 0xff) << 16) |
               ((hmacResult[offset + 2] & 0xff) << 8) |
               (hmacResult[offset + 3] & 0xff)
               
  const totp = code % 1000000
  return String(totp).padStart(6, '0')
}

async function clickOptionRobustly(page: Page, locator: any, label: string) {
  try {
    await locator.click({ force: true, timeout: 5000 })
    console.log(`  [Autofill] Click thành công: ${label}`)
  } catch (err) {
    console.log(`  [Autofill] Click thất bại: ${label}. Thử JS click...`)
    await locator.evaluate((el: HTMLElement) => {
      if (!el) return
      el.click()
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    })
  }
}

async function autofillGoogleLogin(page: Page) {
  console.log(`[Autofill] Bắt đầu tự động đăng nhập Google cho: ${EMAIL}`)
  
  await page.screenshot({ path: path.join(DEBUG_DIR, 'flow_login_0_start.png') })
  
  // 1. Điền hoặc chọn Email
  const accountOption = page.locator(`[data-email="${EMAIL}"], div:has-text("${EMAIL}"), li:has-text("${EMAIL}")`).last()
  const hasAccountOption = await accountOption.count() > 0 && await accountOption.isVisible({ timeout: 5000 }).catch(() => false)
  
  if (hasAccountOption) {
    console.log(`  [Autofill] Phát hiện tài khoản có sẵn trong danh sách. Click chọn tài khoản...`)
    await clickOptionRobustly(page, accountOption, 'Chọn tài khoản có sẵn')
    await sleep(6000)
    await page.screenshot({ path: path.join(DEBUG_DIR, 'flow_login_1_after_account_select.png') })
  } else {
    console.log('  [Autofill] Không thấy tài khoản sẵn. Tiến hành điền email vào input...')
    await page.waitForSelector('input[name="identifier"]', { state: 'attached', timeout: 10000 })
    const emailInput = page.locator('input[name="identifier"]')
    await emailInput.focus()
    await sleep(400 + Math.random() * 300)
    await emailInput.pressSequentially(EMAIL, { delay: 70 + Math.random() * 60 })
    await sleep(600)
    
    const nextBtn = page.locator('button:has-text("Next"), button:has-text("Tiếp theo"), #identifierNext button').first()
    if (await nextBtn.isVisible()) {
      await nextBtn.click({ force: true })
    } else {
      await page.keyboard.press('Enter')
    }
    await sleep(5000)
    await page.screenshot({ path: path.join(DEBUG_DIR, 'flow_login_1_after_email_submit.png') })
  }

  // 2. Điền Mật khẩu
  console.log('  [Autofill] Chờ hiển thị ô nhập mật khẩu...')
  try {
    await page.waitForSelector('input[type="password"], input[name="Passwd"]', { state: 'attached', timeout: 15000 })
  } catch (err: any) {
    console.log('  [Autofill] Timeout chờ mật khẩu. Chụp ảnh màn hình hiện tại để debug...')
    await page.screenshot({ path: path.join(DEBUG_DIR, 'flow_login_err_password_timeout.png') })
    throw err
  }
  
  const passInput = page.locator('input[type="password"], input[name="Passwd"]').first()
  await passInput.focus()
  await sleep(400 + Math.random() * 300)
  await passInput.pressSequentially(PASSWORD, { delay: 70 + Math.random() * 60 })
  await sleep(600)

  const passNextBtn = page.locator('button:has-text("Next"), button:has-text("Tiếp theo"), #passwordNext button').first()
  if (await passNextBtn.isVisible()) {
    await passNextBtn.click({ force: true })
  } else {
    await page.keyboard.press('Enter')
  }

  await sleep(6000)
  await page.screenshot({ path: path.join(DEBUG_DIR, 'flow_login_2_after_password_submit.png') })

  // 3. Vòng lặp xử lý các màn hình xác thực challenge bảo mật
  const checkStartTime = Date.now()
  let loopCount = 0
  while (Date.now() - checkStartTime < 60000) {
    loopCount++
    const url = page.url()
    if (!url.includes('accounts.google.com') && !url.includes('signin') && !url.includes('challenge')) {
      console.log('[Autofill] Đã chuyển trang khỏi màn hình Google Login!')
      break
    }

    // Phát hiện Authenticator App (2FA)
    const authAppOption = page.locator('div[data-challengetype="6"], li[data-challengetype="6"], [role="link"]:has-text("Authenticator"), [role="button"]:has-text("Authenticator")').first()
    if (await authAppOption.isVisible()) {
      console.log('  [Autofill] Chọn phương thức xác thực Authenticator...')
      await clickOptionRobustly(page, authAppOption, 'Google Authenticator')
      await sleep(4000)
      continue
    }

    // Điền mã 2FA TOTP
    const totpInput = page.locator('input#totpPin, input[name="totpPin"]').first()
    if (await totpInput.isVisible()) {
      const totpCode = generateTOTP(TWO_FA_SECRET)
      console.log(`  [Autofill] Tính toán mã 2FA: ${totpCode}. Đang điền...`)
      await totpInput.click()
      await sleep(300)
      await totpInput.pressSequentially(totpCode, { delay: 70 + Math.random() * 80 })
      await sleep(500)
      await page.keyboard.press('Enter')
      await sleep(6000)
      await page.screenshot({ path: path.join(DEBUG_DIR, `flow_login_3_after_2fa_submit_${loopCount}.png`) })
      continue
    }

    // Vượt màn hình giới thiệu bảo mật hoặc quảng cáo ("Not now" / "Để sau")
    const promoBtn = page.locator('button:has-text("Not now"), button:has-text("Để sau"), [role="button"]:has-text("Not now"), [role="button"]:has-text("Để sau")').first()
    if (await promoBtn.isVisible()) {
      console.log('  [Autofill] Bấm bỏ qua giới thiệu ("Not now"/"Để sau")...')
      await promoBtn.click()
      await sleep(3000)
      continue
    }

    await sleep(2000)
  }
  await page.screenshot({ path: path.join(DEBUG_DIR, 'flow_login_4_final_state.png') })
}

async function launchFlowCDP(port: number = 9222): Promise<{ browser: any; context: BrowserContext; page: Page }> {
  // Kiểm tra xem Chrome debug đã chạy chưa
  let isReady = false
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`)
    isReady = res.ok
  } catch {}

  if (!isReady) {
    console.log(`[FlowBot] Khởi chạy Chrome thực tế với cổng debug: ${port}...`)
    
    // Xóa file lock cũ nếu có để tránh lỗi profile bị khóa
    const lockFile = path.join(PROFILE_DIR, 'SingletonLock')
    try { await fs.unlink(lockFile) } catch {}

    const args = [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${PROFILE_DIR}`,
      '--headless=new', // Chạy ngầm hoàn toàn
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check'
    ]
    
    const child = spawn(CHROME_PATH, args, {
      detached: true,
      stdio: 'ignore'
    })
    child.unref()

    // Đợi cổng debug sẵn sàng (tối đa 15s)
    let retries = 30
    while (retries > 0) {
      await sleep(500)
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/version`)
        if (res.ok) {
          isReady = true
          break
        }
      } catch {}
      retries--
    }
    
    if (!isReady) {
      throw new Error(`Không khởi chạy được Chrome debug tại cổng ${port}`)
    }
  }

  console.log(`[FlowBot] Kết nối Playwright tới Chrome debug cổng ${port}...`)
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
  let context = browser.contexts()[0]
  if (!context) {
    context = await browser.newContext()
  }
  
  const page = context.pages()[0] || await context.newPage()
  
  // Điều hướng
  await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(8000)

  // Tự động xử lý đăng nhập nếu phát hiện trang accounts.google.com
  if (page.url().includes('accounts.google.com')) {
    console.log('⚠ [FlowBot] Phát hiện trình duyệt bị đăng xuất. Tiến hành đăng nhập tự động qua CDP...')
    try {
      await autofillGoogleLogin(page)
      await sleep(2000)
      await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await sleep(8000)
    } catch (err: any) {
      console.error(`❌ Gặp lỗi trong quá trình tự động đăng nhập: ${err.message}`)
      await browser.close().catch(() => {})
      process.exit(1)
    }
  }

  console.log('✓ Trình duyệt đã kết nối Google Flow')
  return { browser, context, page }
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
    const createBtn = page.locator('button:has-text("Create with Google Flow")').first()
    if (await createBtn.count() > 0 && await createBtn.isVisible()) {
      await createBtn.click()
      await sleep(8000)
    }

    if (page.url().endsWith('/flow') || page.url().endsWith('/flow/')) {
      const firstProject = page.locator('a[href*="/project/"], div[role="listitem"]').first()
      if (await firstProject.count() > 0) {
        await firstProject.click()
        await sleep(10000)
      }
    }

    const backBtn = page.locator('button:has(span:text("arrow_back")), button:has(span:text("chevron_left")), button:has(span:text("arrow_left"))').first()
    if (await backBtn.count() > 0 && await backBtn.isVisible()) {
      console.log('  [Settings] Panel Library đang mở. Click đóng...')
      await backBtn.click()
      await sleep(2000)
    }

    console.log(`  [Settings] Kiểm tra và cấu hình tỷ lệ: ${ratio}...`)
    const tuneBtn = page.locator('button:has(span:text("tune")), button:has(span:text("settings")), button[aria-label*="ettings"]').first()
    if (await tuneBtn.count() > 0 && await tuneBtn.isVisible()) {
      await tuneBtn.click()
      await sleep(2500)

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

      const countBtn = page.locator('button[id$="-trigger-SINGLE"], button:has-text("1x")').first()
      if (await countBtn.count() > 0 && await countBtn.isVisible()) { 
        await countBtn.click()
        await sleep(1000) 
      }

      await page.keyboard.press('Escape')
      await sleep(1500)
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

  console.log('  [Download] Đang chờ ảnh mới sinh hoàn tất để download...')

  while (Date.now() < deadline) {
    await sleep(4000)

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
          console.log('  [Download] Tìm thấy nút Download gốc. Tiến hành tải ảnh...')
          const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
          await downloadBtn.click({ force: true })
          const download = await downloadPromise
          await fs.mkdir(path.dirname(savePath), { recursive: true })
          await download.saveAs(savePath)
          const { size } = await fs.stat(savePath)
          if (size > 20000) {
            console.log(`  ✓ Đã lưu ảnh thành công: ${path.basename(savePath)} (${Math.round(size/1024)}KB)`)
            return true
          }
        } else {
          const imgEl = page.locator(`img[src="${newImgData.src}"]`).first()
          if (await imgEl.count() > 0) {
            await imgEl.click()
            await sleep(2000)
            
            const panelDownloadBtn = page.locator('button:has-text("Download"), a:has-text("Download"), button[aria-label*="ownload"]').first()
            if (await panelDownloadBtn.count() > 0 && await panelDownloadBtn.isVisible()) {
              const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
              await panelDownloadBtn.click({ force: true })
              const download = await downloadPromise
              await fs.mkdir(path.dirname(savePath), { recursive: true })
              await download.saveAs(savePath)
              const { size } = await fs.stat(savePath)
              if (size > 20000) {
                console.log(`  ✓ Đã lưu ảnh từ panel: ${path.basename(savePath)}`)
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
        console.log(`  ⚠ Lỗi tải ảnh trực tiếp (${err.message}). Fallback về trích xuất canvas...`)
      }

      // Fallback canvas
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
          console.log(`  ✓ Đã lưu ảnh (Fallback Canvas): ${path.basename(savePath)}`)
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

async function main() {
  const prompt = "A close-up product mockup showing the smooth flat top surface of a dark walnut wood board with beautiful premium natural wood grain. Warm studio side lighting reflecting softly on the polished surface, creating a realistic, premium material background. Completely clean and plain wood surface with absolutely no text, prints, stickers, logos, or marks."
  const ratio = 'SQUARE'
  
  console.log(`Bắt đầu chạy sinh ảnh gỗ từ Google Flow...`)
  const { browser, page } = await launchFlowCDP()
  
  const oldUrls = await getValidImageUrls(page)
  const sent = await generateImage(page, prompt, ratio)
  if (!sent) {
    console.error('Lỗi khi gửi prompt lên Google Flow')
    await browser.close().catch(() => {})
    return
  }
  
  const saved = await downloadImage(page, SAVE_PATH, oldUrls)
  if (saved) {
    console.log('Sinh ảnh nền gỗ thành công!')
  } else {
    console.error('Lỗi: Hết thời gian chờ tạo ảnh')
  }
  
  await browser.close().catch(() => {})
}

main().catch(console.error)
