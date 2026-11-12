import { expect, test } from '@playwright/test'

test.describe('mobile', () => {
  test('menu groups tools by intention and navigates', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    const dialog = page.getByRole('dialog')
    for (const group of ['Explore', 'Connect', 'Learn']) await expect(dialog.getByRole('heading', { name: group })).toBeVisible()
    await dialog.getByRole('link', { name: /^Triads/ }).click()
    await expect(page).toHaveURL(/\/triads$/)
    await expect(dialog).toBeHidden()
  })

  test('no horizontal page scroll; the neck scrolls itself to the chosen shape', async ({ page }) => {
    await page.goto('/caged?key=G&shape=D&at=5')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(pageOverflow).toBeLessThanOrEqual(0)
    const neck = page.getByRole('group', { name: /D shape/ })
    await expect.poll(() => neck.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50)
  })

  test('no tool page scrolls sideways on a phone', async ({ page }) => {
    // Regression: a grid with columns only at lg: let the neck widen /chords/identify to ~1000px.
    for (const url of [
      '/fretboard',
      '/chords',
      '/chords/elsewhere?root=G&area=5-9',
      '/chords/identify?frets=8-10-10-9-8-8',
      '/scales',
      '/scales/connect?root=A&scale=minor-pentatonic&from=1',
      '/scales/modes',
      '/triads?root=C&strings=123',
      '/triads/progressions',
      '/fills?key=G&from=1&to=4',
      '/fills/chord-tones',
      '/fills/rhythm-to-lead?key=G&shape=E',
      '/learn/know-the-notes',
      '/reference/intervals',
    ]) {
      await page.goto(url)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, url).toBeLessThanOrEqual(0)
    }
  })

  test('home hero is usable by touch', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'E shape, frets 3 to 5' }).tap()
    await expect(page.getByText('E shape at fret 3.')).toBeVisible()
  })
})
