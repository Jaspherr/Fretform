# Neckline

An interactive fretboard guide for guitarists who know the basics but still get lost on the neck. Chords, triads, scales, modes, CAGED and fills — all drawn from one theory engine onto one reusable fretboard.

(“Neckline” is a placeholder name; it lives only in `src/brand.ts`.)

## Scripts

```bash
npm install
npm run dev      # local dev server
npm test         # theory engine, legend, prefs, search (vitest)
npm run test:e2e # user journeys in a real browser (Playwright)
npm run build    # type-check + production build
npm run lint     # oxlint
```

## Layout

```
src/
  theory/        Pure music theory, no React. Everything is computed from pitch classes.
    notes.ts       pitch classes, enharmonic spelling (auto / sharps / flats)
    intervals.ts   interval labels ("b3", "#4") → semitones, degree, color family
    tones.ts       formula + root → spelled tones
    chords.ts      chord qualities (formulas are data)
    scales.ts      scale definitions (add a scale = add an entry)
    modes.ts       modes relative to the parent major scale
    fretboard.ts   tuning, note at string+fret, string sets, neck regions
    voicings.ts    movable chord templates (CAGED + others), validated by tests
    triads.ts      triads per string set, inversions, triads inside a chord, voice-leading
    caged.ts       CAGED positions and scale regions for any key
    patterns.ts    pentatonic boxes, 3-notes-per-string, box connections
    identify.ts    chord identification with inversions and ambiguity
    diatonic.ts    diatonic chords and common progressions
    fills.ts       safe / passing / target classification + example fills
    theory.test.ts
  components/
    fretboard/     the single Fretboard (SVG), mark builders, note glyphs, legend/badges
    diagrams/      chord box diagram, tab, voicing card
    controls/      root/chord/scale/range/layer selectors, display settings
    layout/        app shell, search, page primitives
    ui/            shadcn-style primitives on Radix
  content/       lessons, reference topics, search index
  pages/         one file per section; tool state lives in the URL
e2e/             Playwright journeys (desktop + mobile)
```

Tool state is in the URL (e.g. `/caged?key=G&shape=E`, `/triads?root=C&strings=123`), so any diagram can be bookmarked. Display preferences (labels, spelling, handedness, theme, last key, dismissed tips) are saved in localStorage.
