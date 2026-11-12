import type { CSSProperties } from 'react'
import type { MarkTone } from './marks'

/**
 * One visual language for note roles, used by the neck, chord boxes and the
 * legend. Shape carries the role as well as colour, so it reads in greyscale:
 *   root = square · 3rd = circle · 5th = hexagon · 7th = diamond
 *   other chord/scale tones = small circle · targets = circle + dashed ring
 */
export type GlyphShape = 'square' | 'circle' | 'hex' | 'diamond' | 'small'

export const SHAPE: Record<MarkTone, GlyphShape> = {
  root: 'square',
  third: 'circle',
  fifth: 'hex',
  seventh: 'diamond',
  other: 'small',
  target: 'circle',
  plain: 'small',
  selected: 'circle',
}

export const FILL: Record<MarkTone, string> = {
  root: 'var(--iv-root)',
  third: 'var(--iv-third)',
  fifth: 'var(--iv-fifth)',
  seventh: 'var(--iv-seventh)',
  other: 'var(--iv-other)',
  target: 'var(--target)',
  plain: 'var(--note-hollow)',
  selected: 'var(--select)',
}

export const ON_FILL: Record<MarkTone, string> = {
  root: 'var(--on-root)',
  third: 'var(--on-third)',
  fifth: 'var(--on-fifth)',
  seventh: 'var(--on-seventh)',
  other: 'var(--on-other)',
  target: 'var(--on-target)',
  plain: 'var(--note-hollow-ink)',
  selected: 'var(--ink)',
}

/** Visual radius for a nominal radius r — balances optical size across shapes. */
export function glyphRadius(shape: GlyphShape, r: number) {
  return shape === 'small' ? r * 0.88 : shape === 'diamond' ? r * 1.22 : shape === 'hex' ? r * 1.08 : r
}

function hexPoints(cx: number, cy: number, r: number) {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

export function Glyph({ tone, cx, cy, r, style }: { tone: MarkTone; cx: number; cy: number; r: number; style?: CSSProperties }) {
  const shape = SHAPE[tone]
  const R = glyphRadius(shape, r)
  switch (shape) {
    case 'square':
      return <rect x={cx - R} y={cy - R} width={R * 2} height={R * 2} rx={R * 0.32} style={style} />
    case 'hex':
      return <polygon points={hexPoints(cx, cy, R)} strokeLinejoin="round" style={style} />
    case 'diamond':
      return <polygon points={`${cx},${cy - R} ${cx + R},${cy} ${cx},${cy + R} ${cx - R},${cy}`} strokeLinejoin="round" style={style} />
    default:
      return <circle cx={cx} cy={cy} r={R} style={style} />
  }
}

/** Inline swatch for legends and badges: the same glyph the neck draws. */
export function GlyphSwatch({ tone, hollow, ring, size = 16 }: { tone: MarkTone; hollow?: boolean; ring?: 'target' | 'shared' | 'char'; size?: number }) {
  const c = size / 2
  const r = size * 0.32
  const ringR = r + 3.2
  return (
    <svg width={size + 4} height={size + 4} viewBox={`-2 -2 ${size + 4} ${size + 4}`} aria-hidden="true" className="shrink-0 overflow-visible">
      {ring === 'target' && <circle cx={c} cy={c} r={ringR} fill="none" strokeWidth={1.6} strokeDasharray="2.4 2" style={{ stroke: 'var(--target)' }} />}
      {ring === 'shared' && <circle cx={c} cy={c} r={ringR} fill="none" strokeWidth={1.6} style={{ stroke: 'var(--ink)' }} />}
      {ring === 'char' && <circle cx={c} cy={c} r={ringR} fill="none" strokeWidth={2.2} style={{ stroke: 'var(--ink)' }} />}
      <Glyph
        tone={tone}
        cx={c}
        cy={c}
        r={r}
        style={
          hollow || tone === 'plain'
            ? { fill: 'var(--note-hollow)', stroke: tone === 'plain' ? 'var(--note-hollow-ink)' : FILL[tone], strokeWidth: 1.6 }
            : { fill: FILL[tone] }
        }
      />
    </svg>
  )
}
