import { test, expect } from '@playwright/test'

test.describe('Site public', () => {
  test("la page d'accueil répond en français", async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page).toHaveTitle(/REC 242/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('la planche de composants charge les styles de la maquette', async ({ page }) => {
    const r = await page.goto('http://localhost:3000/composants')
    test.skip(r?.status() === 404, 'Planche réservée au développement (serveur de production)')
    await expect(page.locator('h1')).toHaveText('Composants')
    const bg = await page
      .locator('.rec-btn--primary')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(11, 94, 50)')
    const font = await page.locator('h1').evaluate(() => getComputedStyle(document.body).fontFamily)
    expect(font).toContain('Inter')
  })
})
