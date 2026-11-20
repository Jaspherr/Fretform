import { expect, test } from '@playwright/test'

/**
 * The critical guitarist journeys. Each one is a question the product promises
 * to answer; the assertions check that the answer actually appears.
 */
test.describe('desktop journeys', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only')

  test('navigation is grouped by what you are working on and reaches every tool', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Main' })
    for (const group of ['Play', 'Chords', 'Scales', 'Changes', 'Learn']) await expect(nav.getByRole('list', { name: group })).toBeVisible()
    await nav.getByRole('link', { name: 'CAGED' }).click()
    await expect(page).toHaveURL(/\/caged$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('CAGED in')
    await nav.getByRole('link', { name: 'Triads' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('triads on strings')
    await nav.getByRole('link', { name: 'The neck' }).click()
    await expect(page).toHaveURL(/:4173\/$/)
  })

  test('the neck: one chord, five questions, each a layer on the same fretboard', async ({ page }) => {
    await page.goto('/')
    const steps = page.getByRole('navigation', { name: 'Questions about this chord' })
    await expect(page.getByText(/G is G – B – D/)).toBeVisible()
    // Tap a note: jump to a shape that uses it.
    await page.getByRole('button', { name: 'Next: Where can I grab it?' }).click()
    await expect(page).toHaveURL(/step=shape/)
    await expect(page.getByText(/E shape at fret 3/)).toBeVisible()
    await page.getByRole('button', { name: 'Next shape up the neck' }).click()
    await expect(page).toHaveURL(/at=/)
    await page.getByRole('button', { name: 'Previous shape down the neck' }).click()
    await steps.getByRole('button', { name: 'What’s the core of the shape?' }).click()
    await expect(page.getByText(/strings 1–2–3 hold just B, D, G — a major triad in 1st inversion/)).toBeVisible()
    await steps.getByRole('button', { name: 'Where can it go next?' }).click()
    await page.getByRole('button', { name: 'Move to C' }).click()
    await expect(page.getByText('B moves up 1 fret to C; D moves up 2 frets to E; G stays — it’s in both chords')).toBeVisible()
    await page.getByRole('link', { name: /Go deeper: Fill the gap G → C/ }).click()
    await expect(page).toHaveURL(/\/fills\?key=G&from=1&to=4/)
    // Change key from the deep link: everything recomputes in the new key.
    await page.goto('/?chord=C&q=minor&step=triad')
    await expect(page.getByText(/minor triad/)).toBeVisible()
  })

  test('a lesson ends with a challenge that explains every tap', async ({ page }) => {
    await page.goto('/learn/know-the-intervals')
    const ch = page.getByRole('region', { name: /Your turn/ })
    await expect(ch.getByText(/Find the (3rd|♭3rd|5th) of/)).toBeVisible()
    // Tap one of the given roots: it is explained, and it is not the answer.
    await ch.getByRole('button', { name: 'Another one' }).click()
    await ch.getByRole('group').first().focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await expect(ch.getByRole('status')).not.toBeEmpty()
  })

  test('alternative chord: "I know G here, where else can I play it?"', async ({ page }) => {
    await page.goto('/chords/elsewhere?root=G&area=5-9')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where else can I play G?')
    const bands = page.getByRole('group', { name: 'Shapes along the neck' }).getByRole('button')
    expect(await bands.count()).toBeGreaterThan(4)
    await bands.nth(2).click()
    await expect(bands.nth(2)).toHaveAttribute('aria-pressed', 'true')
  })

  test('chord selection updates the neck, the URL, and rings the triad inside a barre shape', async ({ page }) => {
    await page.goto('/chords')
    await page.getByRole('radiogroup', { name: 'Which chord?' }).getByRole('radio', { name: 'G', exact: true }).click()
    await page.getByRole('radiogroup', { name: 'Chord quality' }).getByRole('radio', { name: 'Minor', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('G Minor')
    await expect(page).toHaveURL(/root=G/)
    await expect(page).toHaveURL(/quality=minor/)
    await page.getByRole('button', { name: /Em shape/ }).first().click()
    await expect(page.getByText(/triad .* already inside it/)).toBeVisible()
  })

  test('unknown shape: "I found this around fret 8, what is it?"', async ({ page }) => {
    await page.goto('/chords/identify?frets=8-10-10-9-8-8')
    await expect(page.getByText('Exact match').first()).toBeVisible()
    await expect(page.getByRole('main')).toContainText('C Major')
  })

  test('triads: C major on strings 1–2–3, step through inversions', async ({ page }) => {
    await page.goto('/triads?root=C&strings=123')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('C triads on strings 1–2–3')
    await page.getByRole('button', { name: 'Next shape' }).click()
    await expect(page.getByText(/(Root position|1st inversion|2nd inversion) at fret \d+/)).toBeVisible()
    // Filter to one inversion: only those shapes remain as bands.
    await page.getByRole('group', { name: 'Filter by inversion' }).getByRole('button', { name: /^1st inversion/ }).click()
    const bands = page.getByRole('group', { name: 'Shapes along the neck' }).getByRole('button')
    for (const name of await bands.allTextContents()) expect(name).toBe('1st inv.')
  })

  test('scale connection: leaving A minor pentatonic box 1', async ({ page }) => {
    await page.goto('/scales/connect?root=A&scale=minor-pentatonic&from=1')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Connect the boxes')
    await expect(page.getByText('Shared notes', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('main')).toContainText('6 notes')
  })

  test('CAGED: picking a shape is stored in the URL and survives a reload', async ({ page }) => {
    await page.goto('/caged?key=G')
    await page.getByRole('button', { name: 'E shape, frets 3 to 5' }).click()
    await expect(page).toHaveURL(/shape=E/)
    await expect(page).toHaveURL(/at=3/)
    await page.reload()
    await expect(page.getByRole('button', { name: 'E shape, frets 3 to 5' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: /Next shape: D/ }).click()
    await expect(page).toHaveURL(/shape=D/)
  })

  test('fretboard keyboard access: arrows move the cursor, Enter selects', async ({ page }) => {
    await page.goto('/caged?key=C')
    const neck = page.getByRole('group', { name: /All CAGED shapes for C/ })
    await neck.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText(/String 3 \(G\), fret 6/)).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/shape=/)
  })

  test('rhythm fill: G → C, tapping the neck moves the hand window', async ({ page }) => {
    await page.goto('/fills?key=G&from=1&to=4')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fill the gap: G → C')
    const hand = page.getByText(/Your hand is at/)
    await expect(hand).toContainText('frets 3–7')
    const neck = page.getByRole('group', { name: /Fill notes from G to C/ })
    await neck.focus()
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await expect(hand).toContainText('frets 8–12')
    await expect(page).toHaveURL(/frets=8/)
  })

  test('rhythm → lead: layers build up on one chord shape', async ({ page }) => {
    await page.goto('/fills/rhythm-to-lead?key=G&shape=E')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('group', { name: /G E shape with layers/ })).toBeVisible()
  })

  test('label mode toggle on the neck switches notes to intervals everywhere', async ({ page }) => {
    await page.goto('/triads?root=C&strings=123')
    const svgText = page.locator('svg[role="img"] text')
    await expect(svgText.filter({ hasText: /^E$/ }).first()).toBeVisible()
    await page.getByRole('radiogroup', { name: 'Label notes with' }).first().getByRole('radio', { name: 'Intervals' }).click()
    await expect(svgText.filter({ hasText: /^3$/ }).first()).toBeVisible()
    await page.goto('/chords')
    await expect(page.getByRole('radiogroup', { name: 'Label notes with' }).first().getByRole('radio', { name: 'Intervals' })).toHaveAttribute('aria-checked', 'true')
  })

  test('modes are spelled from their parent key: D♯ Locrian, parent E major', async ({ page }) => {
    // Regression: this used to read "E♭ Locrian … parent E major … E♭m7b5" (E♭ Locrian needs B𝄫).
    await page.goto('/scales/modes?root=Eb&mode=locrian')
    await expect(page.getByRole('heading', { name: /D♯ Locrian/ })).toBeVisible()
    await expect(page.getByText('E major', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'D♯m7b5' })).toBeVisible()
    await expect(page.getByText(/E♭ Locrian|E♭m7b5/)).toHaveCount(0)
  })

  test('no console errors on the main tools', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    for (const path of ['/', '/fretboard', '/chords', '/chords/identify', '/triads', '/triads/progressions', '/scales', '/scales/connect', '/scales/modes', '/caged', '/fills', '/fills/chord-tones', '/fills/rhythm-to-lead', '/learn', '/learn/connect-caged', '/reference']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    }
    expect(errors).toEqual([])
  })
})
