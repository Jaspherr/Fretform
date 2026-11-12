import { memo } from 'react'
import { usePrefs } from '@/lib/prefs'
import { cn } from '@/lib/utils'
import { STRINGS_LOW_TO_HIGH, pcAt } from '@/theory/fretboard'
import { prettyInterval } from '@/theory/intervals'
import { displayNote, pretty } from '@/theory/notes'
import { type Tone, toneMap } from '@/theory/tones'
import { FILL, Glyph, ON_FILL } from '@/components/fretboard/glyph'


/**
 * Classic vertical chord box (low E on the left). Dots carry interval or note
 * text so the chord's anatomy is visible, not just the grip.
 */
export const ChordDiagram = memo(function ChordDiagram({
  frets,
  tones,
  fingers,
  showFingers,
  className,
  label,
}: {
  frets: (number | null)[]
  tones: Tone[]
  fingers?: (number | null)[]
  showFingers?: boolean
  className?: string
  label: string
}) {
  const { labels, accidentals } = usePrefs()
  const map = toneMap(tones)
  const fretted = frets.filter((f): f is number => f !== null && f > 0)
  const maxF = fretted.length ? Math.max(...fretted) : 0
  const minF = fretted.length ? Math.min(...fretted) : 1
  const start = maxF <= 4 ? 1 : minF
  const rows = Math.max(4, maxF - start + 1)
  const W = 132
  const left = 30
  const top = 26
  const gapX = (W - left - 14) / 5
  const gapY = 26
  const H = top + gapY * rows + (showFingers ? 30 : 12)
  const x = (i: number) => left + i * gapX
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('w-full max-w-[150px]', className)} role="img" aria-label={label}>
      {/* nut or position */}
      {start === 1 ? (
        <rect x={x(0) - 1} y={top - 4} width={x(5) - x(0) + 2} height={4} rx={1} style={{ fill: 'var(--ink)' }} />
      ) : (
        <text x={left - 13} y={top + gapY / 2 + 4} textAnchor="end" style={{ fill: "var(--muted)", fontSize: 10.5, fontWeight: 600 }} >
          {start}
        </text>
      )}
      {Array.from({ length: rows + 1 }, (_, r) => (
        <line key={r} x1={x(0)} x2={x(5)} y1={top + r * gapY} y2={top + r * gapY} strokeWidth={1} style={{ stroke: 'var(--line-strong)' }} />
      ))}
      {STRINGS_LOW_TO_HIGH.map((_, i) => (
        <line key={i} x1={x(i)} x2={x(i)} y1={top} y2={top + rows * gapY} strokeWidth={1 + (5 - i) * 0.18} style={{ stroke: 'var(--ink-soft)' }} />
      ))}
      {frets.map((f, i) => {
        const s = STRINGS_LOW_TO_HIGH[i]
        if (f === null)
          return (
            <text key={i} x={x(i)} y={top - 10} textAnchor="middle" style={{ fill: 'var(--muted)', fontSize: 12, fontWeight: 600 }}>
              ×
            </text>
          )
        const t = map.get(pcAt(s, f))
        const text = t ? (labels === 'notes' ? pretty(displayNote(t.spelled, accidentals)) : prettyInterval(t.interval)) : ''
        const isRoot = t?.family === 'root'
        const family = t?.family ?? 'other'
        const fill = FILL[family]
        const ink = ON_FILL[family]
        if (f === 0)
          return (
            <g key={i}>
              <circle cx={x(i)} cy={top - 13} r={7.5} strokeWidth={1.5} style={{ fill: isRoot ? fill : 'var(--surface)', stroke: isRoot ? fill : 'var(--ink-soft)' }} />
              <text x={x(i)} y={top - 10} textAnchor="middle" style={{ fill: isRoot ? ink : 'var(--ink)', fontSize: 8, fontWeight: 700 }}>
                {text}
              </text>
            </g>
          )
        const cy = top + (f - start + 0.5) * gapY
        return (
          <g key={i}>
            <Glyph tone={family} cx={x(i)} cy={cy} r={9.5} style={{ fill, stroke: 'rgba(0,0,0,0.18)' }} />
            <text x={x(i)} y={cy + 3.4} textAnchor="middle" style={{ fill: ink, fontSize: text.length > 2 ? 8 : 9.5, fontWeight: 700 }}>
              {text}
            </text>
          </g>
        )
      })}
      {showFingers &&
        fingers?.map((fi, i) =>
          fi ? (
            <text key={i} x={x(i)} y={top + rows * gapY + 18} textAnchor="middle"  style={{ fill: 'var(--muted)', fontSize: 10.5 }}>
              {fi}
            </text>
          ) : null,
        )}
    </svg>
  )
})
