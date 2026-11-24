# Fretform — working notes

Interactive fretboard guide for intermediate guitarists. Core idea: **see the fretboard, not just the shape** — every tool should show how a thing you already know (a chord shape, a box) connects to the rest of the neck.

## Commands

- `npm run dev` — Vite dev server (pages are lazy chunks; first visit to a route is slow in dev)
- `npm test` — vitest unit tests (`src/**/*.test.ts`, node env)
- `npm run test:e2e` — Playwright journeys in `e2e/` (builds, then serves `vite preview` on :4173). `mobile.spec.ts` runs only in the Pixel 7 project.
- `npm run build` — `tsc -b` + Vite build. `noUnusedLocals` is on: unused imports fail the build.
- `npm run lint` — oxlint (fast-refresh warnings on mixed export files are known and accepted)

## Architecture rules

- `src/theory/` is pure TypeScript, no React. Pitch classes internally; spelling is a layer on top (`notes.ts`). Chords/scales are formula data; playable shapes are tested movable templates (`voicings.ts`). Any theory change needs a test in `theory.test.ts`. Lesson challenges come from `theory/challenges.ts` (generated, never a stored answer key).
- **One fretboard.** `components/fretboard/Fretboard.tsx` renders `FretMark[]` and knows nothing about music. Pages build marks with helpers in `marks.ts` (`toneMarks`, `positionMarks`, `mergeMarks`).
  - `emphasis`: `strong`/`normal` = filled, `soft` = outlined in role colour (still labelled — never fade to unreadable), `ghost` = small unlabelled ring.
  - `bands` = clickable shape blocks above the neck, positioned from the neck's own geometry (never draw a separate linear "map" — it won't line up with tapered frets).
  - `onSelect` makes notes tappable; prefer direct manipulation on the neck over extra form controls.
  - The legend is generated from the marks unless a page passes `legend={…}` / `legend={false}`.
  - Notes/Intervals/Both toggle lives on the neck (global pref), not in page controls.
- **Note-role visual language** (`glyph.tsx`): root = square, 3rd = circle, 5th = hexagon, 7th = diamond, other tones = small neutral-grey circle, next-chord target = dashed bluish-green ring, shared/stays-put = solid ink ring. Shape + text always accompany colour. Chord boxes and legends reuse the same glyphs. Colours are based on the Okabe–Ito palette (tokens in `index.css`); some pairs are close under colour-vision simulation, so the shape and label are essential; colour appears only on notes. Filled notes get a dark outline (`--note-edge`) so light colours keep a visible edge on white.
- **Motion explains.** Give a mark an `id` (a voice, a string) and it glides to its new fret instead of popping (`.fret-pos` in `index.css`). Use it where following a note teaches something (shape changes, voice leading); reduced motion turns it off. Pages where one shape changes can pass `glide` to `<Fretboard>` instead of hand-writing ids (foreground notes get per-string identities).
- **Colour is reserved for music** — the interface is monochrome. Don't add interface colours. Don't add decorative colour, gradients, or all-caps labels. Tokens live in `src/index.css` (light `:root`, dark `.dark`). Colour system "Neutral Ink" (all in `src/index.css`, hex): warm neutrals in light, graphite in dark; **one interface accent** (ink in light, near-white in dark, `--accent`/`--on-accent`) for actions, active nav, selection, focus and the selected neck region — never on a note; feedback (`--success`/`--warning`/`--error`) always paired with an icon and words. Control borders and link underlines use `--line-control` (3:1 against surfaces); links are always underlined. The board uses `--neck*` tokens; text and hollow notes on it use `--neck-ink` / `--neck-hollow`.
- Type: **Instrument Sans** (`font-sans`) for all interface and explanatory text; **Geist Mono** (`font-mono`) only for musical and technical data — note/interval labels in the SVGs and badges, fret numbers, tab, formulas, roman numerals, shortcuts. Never mono for sentences. `.prose-note` sets explanatory text (size utilities override it). Fonts are self-hosted subsets in `src/assets/fonts` (Latin-1, punctuation, arrows); ♭ ♮ ♯ come from `Music Accidentals`. Weights run 400–700, so don't ask for more.

## State

- Tool state is in the URL via `useUrlParam` / `useRootParam` (`lib/url-state.ts`) so views are shareable. Setters called in the same tick are batched into one navigation — safe to set several params in one handler. Validate every param with `oneOf`/a predicate.
- Display prefs + last root are in localStorage (`lib/prefs.tsx`), passed through `sanitize()` — treat stored values as untrusted.
- Purely transient selection (focused triad, selected voicing card) stays in component state.

## Information architecture

Top nav is grouped by what the player is working on in `components/layout/sections.ts`: **Play** (the neck, home) · **Chords** (Chords, Triads) · **Scales** (Scales, CAGED) · **Changes** (Fills and friends) · **Learn** (Path, Reference). The home page is **the neck** (`components/atlas/Atlas.tsx`): one chord, five questions (notes → shape → triad → scale → next chord), each a layer on the same fretboard, state in the URL (`chord`, `q`, `step`, `at`, `to`). Tools are where you go deeper; every step links to one. Sections with several tools use `SubNav`. Controls are phrased as questions ("Which chord?", "What do you want to see?"); secondary options go in `MoreOptions`. End tools with `NextSteps` (phrased as the player's next question). Main tools also link back to the neck with `OnTheNeck` (`layout/page.tsx`) in the header, at the matching step.

The six journeys the product must keep answering are linked from the home page (`pages/Home.tsx` `QUESTIONS`) and covered in `e2e/journeys.spec.ts` — keep both in sync when routes or params change.
