import { EXPLORER_QUALITIES } from '@/theory/chords'
import { MODES } from '@/theory/modes'
import { ROOT_OPTIONS, SHARP_NAMES, FLAT_NAMES, pretty } from '@/theory/notes'
import { SCALES } from '@/theory/scales'
import { REFERENCE_TOPICS } from './reference'
import { LESSONS } from './lessons'

export interface SearchEntry {
  title: string
  kind: 'Tool' | 'Chord' | 'Scale' | 'Mode' | 'Lesson' | 'Reference'
  to: string
  /** Extra words that should match */
  keywords: string
  /** Ranking nudge for the most commonly wanted results */
  boost?: number
}

const TOOLS: SearchEntry[] = [
  { title: 'Fretboard Explorer', kind: 'Tool', to: '/fretboard', keywords: 'notes neck find note octave landmark fret 12 learn notes quiz' },
  { title: 'Chord Explorer', kind: 'Tool', to: '/chords', keywords: 'chord shapes voicings barre open' },
  { title: 'Play this chord somewhere else', kind: 'Tool', to: '/chords/elsewhere', keywords: 'higher position up the neck alternative voicing where else' },
  { title: 'Chord Identifier', kind: 'Tool', to: '/chords/identify', keywords: 'name this chord what chord identify frets shape' },
  { title: 'Triad Explorer', kind: 'Tool', to: '/triads', keywords: 'triads inversions string sets three note' },
  { title: 'Triads through a progression', kind: 'Tool', to: '/triads/progressions', keywords: 'voice leading progression triads nearest I IV V' },
  { title: 'Scale Explorer', kind: 'Tool', to: '/scales', keywords: 'scales patterns boxes positions 3nps' },
  { title: 'Connect the boxes', kind: 'Tool', to: '/scales/connect', keywords: 'pentatonic box connect positions shared notes' },
  { title: 'Modes made visual', kind: 'Tool', to: '/scales/modes', keywords: 'modes dorian mixolydian lydian phrygian locrian ionian aeolian' },
  { title: 'CAGED Explorer', kind: 'Tool', to: '/caged', keywords: 'caged system shapes c a g e d positions' },
  { title: 'Fill Navigator', kind: 'Tool', to: '/fills', keywords: 'fills licks between chords rhythm target notes passing' },
  { title: 'See the chord inside the scale', kind: 'Tool', to: '/fills/chord-tones', keywords: 'chord tones targeting diatonic chords key' },
  { title: 'Turn your chord into a lead position', kind: 'Tool', to: '/fills/rhythm-to-lead', keywords: 'rhythm lead barre chord pentatonic around chord soloing' },
]

function chordEntries(): SearchEntry[] {
  const out: SearchEntry[] = []
  for (const r of ROOT_OPTIONS) {
    const names = [...new Set([SHARP_NAMES[r.pc], FLAT_NAMES[r.pc]])]
    for (const q of EXPLORER_QUALITIES) {
      const alias = names.map((n) => `${n}${q.symbol} ${n} ${q.name} ${q.id === 'major' ? `${n} chord ${n} major` : ''}`).join(' ')
      out.push({
        title: `${pretty(names.join('/'))} ${q.name}`,
        kind: 'Chord',
        to: `/chords?root=${r.slug}&quality=${q.id}`,
        keywords: `${alias} chord`,
        boost: q.id === 'major' ? 2 : q.tier === 'common' ? 1 : 0,
      })
    }
  }
  return out
}

function scaleEntries(): SearchEntry[] {
  const out: SearchEntry[] = []
  for (const r of ROOT_OPTIONS) {
    const names = [...new Set([SHARP_NAMES[r.pc], FLAT_NAMES[r.pc]])]
    for (const s of SCALES) {
      const isMode = MODES.some((m) => m.scaleId === s.id)
      out.push({
        title: `${pretty(names.join('/'))} ${s.name}`,
        kind: isMode ? 'Mode' : 'Scale',
        to: isMode ? `/scales/modes?root=${r.slug}&mode=${s.id}` : `/scales?root=${r.slug}&scale=${s.id}`,
        keywords: names.map((n) => `${n} ${s.name} ${s.id.replace(/-/g, ' ')}`).join(' ') + ' scale',
      })
    }
  }
  return out
}

let cached: SearchEntry[] | null = null

export function searchIndex(): SearchEntry[] {
  if (cached) return cached
  cached = [
    ...TOOLS,
    ...LESSONS.map((l) => ({ title: l.title, kind: 'Lesson' as const, to: `/learn/${l.slug}`, keywords: `${l.summary} lesson learn` })),
    ...REFERENCE_TOPICS.map((t) => ({ title: t.title, kind: 'Reference' as const, to: `/reference/${t.slug}`, keywords: `${t.summary} theory reference` })),
    ...chordEntries(),
    ...scaleEntries(),
  ]
  return cached
}

const norm = (s: string) => s.toLowerCase().replace(/♯/g, '#').replace(/♭/g, 'b')

/** Token match: every query word must hit title or keywords. Title hits rank higher. */
export function search(query: string, limit = 12): SearchEntry[] {
  const q = norm(query).trim()
  if (!q) return []
  const words = q.split(/\s+/)
  const scored: { e: SearchEntry; score: number }[] = []
  for (const e of searchIndex()) {
    const title = norm(e.title)
    const hay = `${title} ${norm(e.keywords)}`
    const tokens = hay.split(/[\s/]+/)
    let score = 0
    let ok = true
    for (const w of words) {
      // Note names are short; require a whole-token match so "a" doesn't match "major".
      const exact = tokens.includes(w)
      const prefix = w.length >= 3 && tokens.some((t) => t.startsWith(w))
      if (!exact && !prefix) {
        ok = false
        break
      }
      score += exact ? 3 : 1
      if (title.split(/[\s/]+/).includes(w)) score += 2
    }
    if (!ok) continue
    if (e.kind === 'Tool' || e.kind === 'Lesson') score += 1.5
    if (title === q) score += 10
    score += e.boost ?? 0
    score -= title.length / 100
    scored.push({ e, score })
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.e)
}
