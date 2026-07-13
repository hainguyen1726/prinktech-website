import { chromium } from 'playwright'
import * as fs from 'fs/promises'

async function main() {
  const PROFILE_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\vbee-chrome-profile'
  const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  const FLOW_URL = 'https://labs.google/fx/tools/flow/project/406375de-f8bf-41a0-8b0a-f17e87763db4'
  
  console.log('Khoi dong browser...')
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    executablePath: CHROME_PATH,
    viewport: { width: 1280, height: 800 }
  })
  
  const page = context.pages()[0] || await context.newPage()
  console.log('Mo trang Flow...')
  await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(12000) // Cho 12s de trang load
  
  console.log('Chup anh man hinh...')
  const screenshotPath = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\0f3e6447-4925-4758-bf79-c03b5face643\\flow_debug_screenshot.png'
  await page.screenshot({ path: screenshotPath })
  console.log('Da luu anh debug tai: ' + screenshotPath)
  
  const html = await page.content()
  await fs.writeFile('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\0f3e6447-4925-4758-bf79-c03b5face643\\flow_page.html', html, 'utf-8')
  console.log('Da luu HTML nguon trang')
  
  await context.close()
}

main().catch(console.error)
