import { cn } from '@/lib/utils'
import type { IntervalFamily } from '@/theory/intervals'
import { prettyInterval } from '@/theory/intervals'
import { FILL, GlyphSwatch, ON_FILL } from './glyph'
import type { FretMark, MarkTone } from './marks'

export const FAMILY_LABEL: Record<IntervalFamily, string> = {
  root: 'Root',
  third: '3rd',
  fifth: '5th',
  seventh: '7th',
  other: 'Other tones',
}

const BADGE_RADIUS: Record<MarkTone, string> = {
  root: 'rounded-[5px]',
  third: 'rounded-full',
  fifth: 'rounded-[8px]',
  seventh: 'rounded-[3px]',
  other: 'rounded-full',
  plain: 'rounded-full',
  target: 'rounded-full',
  selected: 'rounded-full',
}

function Badge({ text, tone, className }: { text: string; tone: MarkTone; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center px-1.5 font-mono text-[12.5px] font-semibold',
        BADGE_RADIUS[tone],
        tone === 'plain' && 'border border-line-strong',
        className,
      )}
      style={{ background: FILL[tone], color: ON_FILL[tone] }}
    >
      {text}
    </span>
  )
}

/** Coloured badge that always carries text, so colour is never the only signal. */
export function IntervalBadge({ interval, family, className }: { interval: string; family: IntervalFamily; className?: string }) {
  return <Badge text={prettyInterval(interval)} tone={family} className={className} />
}

export function NoteBadge({ note, family, className }: { note: string; family: MarkTone; className?: string }) {
  return <Badge text={note} tone={family} className={className} />
}

export interface LegendItem {
  tone: MarkTone
  label: string
  /** dashed ring = target, ink ring = shared, heavy ring = characteristic */
  ring?: 'target' | 'shared' | 'char'
  /** drawn outlined: a background / scale-only note */
  soft?: boolean
}

export function Legend({ items, className }: { items: LegendItem[]; className?: string }) {
  if (items.length === 0) return null
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-soft', className)} aria-label="Legend">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <GlyphSwatch tone={it.tone} hollow={it.soft} ring={it.ring} />
          {it.label}
        </li>
      ))}
    </ul>
  )
}

const ORDER: MarkTone[] = ['root', 'third', 'fifth', 'seventh', 'other', 'target', 'plain']
const AUTO_LABEL: Partial<Record<MarkTone, string>> = {
  ...FAMILY_LABEL,
  other: 'Other tones (2, 4, 6…)',
  target: 'Next-chord target',
  plain: 'Scale note',
}

/** Build the legend from what is actually on the neck — nothing listed that isn't drawn. */
export function legendFromMarks(marks: FretMark[]): LegendItem[] {
  const tones = new Set<MarkTone>()
  let outlined = false
  const rings = new Set<NonNullable<FretMark['ring']>>()
  for (const m of marks) {
    const e = m.emphasis ?? 'normal'
    if (e === 'ghost') continue
    if (e === 'soft' && m.tone !== 'plain') outlined = true
    else tones.add(m.tone)
    if (m.ring) rings.add(m.ring)
  }
  const items: LegendItem[] = ORDER.filter((t) => tones.has(t) && AUTO_LABEL[t]).map((t) => ({ tone: t, label: AUTO_LABEL[t]! }))
  if (outlined) items.push({ tone: 'third', soft: true, label: 'Outlined = outside the highlighted shape' })
  if (rings.has('target')) items.push({ tone: 'plain', ring: 'target', label: 'Where to land next' })
  if (rings.has('shared')) items.push({ tone: 'plain', ring: 'shared', label: 'Shared / stays put' })
  if (rings.has('char')) items.push({ tone: 'plain', ring: 'char', label: 'Characteristic note' })
  return items
}

export const INTERVAL_LEGEND: LegendItem[] = [
  { tone: 'root', label: 'Root' },
  { tone: 'third', label: '3rd' },
  { tone: 'fifth', label: '5th' },
  { tone: 'seventh', label: '7th' },
  { tone: 'other', label: 'Other tones' },
]
