// Génère guide-back-office.pdf à partir de guide-back-office.html (Playwright, Chromium, A4).
const path = require('path')
const { pathToFileURL } = require('url')
const { chromium } = require(require.resolve('@playwright/test', { paths: [path.resolve(__dirname, '../..')] }))

;(async () => {
  const html = pathToFileURL(path.join(__dirname, 'guide-back-office.html')).href
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.pdf({
    path: path.join(__dirname, 'guide-back-office.pdf'),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  })
  await browser.close()
  console.log('PDF généré')
})().catch((e) => { console.error(e); process.exit(1) })
