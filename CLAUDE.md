# Neckline — working notes

Interactive fretboard guide for intermediate guitarists. Core idea: **see the fretboard, not just the shape** — every tool should show how a thing you already know (a chord shape, a box) connects to the rest of the neck.

## Commands

- `npm run dev` — Vite dev server (pages are lazy chunks; first visit to a route is slow in dev)
- `npm test` — vitest unit tests (`src/**/*.test.ts`, node env)
- `npm run test:e2e` — Playwright journeys in `e2e/` (builds, then serves `vite preview` on :4173). `mobile.spec.ts` runs only in the Pixel 7 project.
- `npm run build` — `tsc -b` + Vite build. `noUnusedLocals` is on: unused imports fail the build.
- `npm run lint` — oxlint (fast-refresh warnings on mixed export files are known and accepted)

## Architecture rules

- `src/theory/` is pure TypeScript, no React. Pitch classes internally; spelling is a layer on top (`notes.ts`). Chords/scales are formula data; playable shapes are tested movable templates (`voicings.ts`). Any theory change needs a test in `theory.test.ts`.
- **One fretboard.** `components/fretboard/Fretboard.tsx` renders `FretMark[]` and knows nothing about music. Pages build marks with helpers in `marks.ts` (`toneMarks`, `positionMarks`, `mergeMarks`).
  - `emphasis`: `strong`/`normal` = filled, `soft` = outlined in role colour (still labelled — never fade to unreadable), `ghost` = small unlabelled ring.
  - `bands` = clickable shape blocks above the neck, positioned from the neck's own geometry (never draw a separate linear "map" — it won't line up with tapered frets).
  - `onSelect` makes notes tappable; prefer direct manipulation on the neck over extra form controls.
  - The legend is generated from the marks unless a page passes `legend={…}` / `legend={false}`.
  - Notes/Intervals/Both toggle lives on the neck (global pref), not in page controls.
- **Note-role visual language** (`glyph.tsx`): root = square, 3rd = circle, 5th = hexagon, 7th = diamond, other tones = small circle, next-chord target = dashed teal ring, shared/stays-put = solid ink ring. Shape + text always accompany colour. Chord boxes and legends reuse the same glyphs.
- **Colour is reserved for music.** UI chrome is monochrome ink on paper (`--accent` = ink). Don't add decorative colour, gradients, or all-caps labels. Tokens live in `src/index.css` (light `:root`, dark `.dark`).
- Type: Archivo (UI, condensed headings), Source Serif 4 for explanatory prose (`.prose-note`).

## State

- Tool state is in the URL via `useUrlParam` / `useRootParam` (`lib/url-state.ts`) so views are shareable. Setters called in the same tick are batched into one navigation — safe to set several params in one handler. Validate every param with `oneOf`/a predicate.
- Display prefs + last root are in localStorage (`lib/prefs.tsx`), passed through `sanitize()` — treat stored values as untrusted.
- Purely transient selection (focused triad, selected voicing card) stays in component state.

## Information architecture

Top nav is grouped by intention in `components/layout/sections.ts`: **Explore** (Fretboard, Chords, Scales) · **Connect** (Triads, CAGED, Fills) · **Learn** (Path, Reference). Sections with several tools use `SubNav`. Controls are phrased as questions ("Which chord?", "What do you want to see?"); secondary options go in `MoreOptions`. End tools with `NextSteps` (phrased as the player's next question).

The six journeys the product must keep answering are linked from the home page (`pages/Home.tsx` `QUESTIONS`) and covered in `e2e/journeys.spec.ts` — keep both in sync when routes or params change.
