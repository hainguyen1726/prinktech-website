import { chromium } from 'playwright'
import { promises as fs } from 'fs'
import path from 'path'

const PROFILE_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\vbee-chrome-profile'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const SCREENSHOT_PATH = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\b91b97d1-bd46-4303-9e1c-25ad0a0b3bc5\\google_account_info.png'

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log('Đang khởi động trình duyệt kiểm tra tài khoản...')
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true, // Chạy headless để chắc chắn chụp ảnh màn hình chính xác và không bị lỗi Session GUI
    executablePath: CHROME_PATH,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    viewport: { width: 1280, height: 800 }
  })

  const page = context.pages()[0] || await context.newPage()
  await page.goto('https://myaccount.google.com/', { waitUntil: 'networkidle', timeout: 60000 })
  await sleep(4000) // Đợi trang render hoàn chỉnh

  // Thử trích xuất Email và Tên từ trang Account
  let accountEmail = 'Không tìm thấy email'
  let accountName = 'Không tìm thấy tên'

  try {
    // 1. Quét tìm email dạng @gmail.com hoặc domain khác trong DOM
    accountEmail = await page.evaluate(() => {
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null)
      let node;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      while (node = walk.nextNode()) {
        const text = node.nodeValue || ''
        const match = text.match(emailRegex)
        if (match && !text.includes('google.com') && !text.includes('feedback')) {
          return match[0]
        }
      }
      // Fallback: Tìm trong aria-label của avatar/nút tài khoản
      const avatarBtn = document.querySelector('a[href*="SignOutOptions"], [aria-label*="@"]')
      if (avatarBtn) {
        const label = avatarBtn.getAttribute('aria-label') || ''
        const match = label.match(emailRegex)
        if (match) return match[0]
      }
      return 'Không tìm thấy email'
    })

    // 2. Lấy tên hiển thị chào mừng (Ví dụ: "Welcome, [Name]")
    accountName = await page.evaluate(() => {
      const heading = document.querySelector('h1')
      if (heading) return heading.innerText.trim()
      return 'Không tìm thấy tên chào mừng'
    })
  } catch (err: any) {
    console.error('Lỗi trích xuất thông tin text:', err.message)
  }

  console.log(`[RESULT_EMAIL] ${accountEmail}`)
  console.log(`[RESULT_NAME] ${accountName}`)

  // Chụp ảnh màn hình lưu lại làm bằng chứng trực quan cho người dùng
  await fs.mkdir(path.dirname(SCREENSHOT_PATH), { recursive: true })
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false })
  console.log(`✓ Đã chụp ảnh màn hình thông tin tài khoản tại: ${SCREENSHOT_PATH}`)

  await context.close()
}

main().catch(console.error)
