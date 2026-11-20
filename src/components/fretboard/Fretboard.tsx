import { memo, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Segmented } from '@/components/ui/segmented'
import { type LabelMode, usePrefs } from '@/lib/prefs'
import { cn } from '@/lib/utils'
import {
  DOUBLE_MARKERS,
  type FretPos,
  type FretRange,
  FULL_RANGE,
  SINGLE_MARKERS,
  STANDARD_TUNING,
  type StringNum,
  pcAt,
} from '@/theory/fretboard'
import { pcName, pretty } from '@/theory/notes'
import { FILL, Glyph, ON_FILL, SHAPE, glyphRadius } from './glyph'
import { type LegendItem, Legend, legendFromMarks } from './Legend'
import type { FretMark } from './marks'

/** A labelled span of frets drawn above the neck (e.g. the five CAGED shapes). Clickable. */
export interface FretBand {
  id: string
  label: string
  start: number
  end: number
  active?: boolean
  /** Accessible name; defaults to the label */
  description?: string
}

export interface FretboardProps {
  marks: FretMark[]
  /** Which frets to draw. Fret 0 = the open-string column. */
  range?: FretRange
  /** Shaded band, e.g. a CAGED region or the selected fret range */
  region?: FretRange | null
  regionLabel?: string
  /** Frets to keep in view when the neck has to scroll (defaults to the region / active band) */
  focus?: FretRange | null
  /** Brighten these strings, dim the rest */
  highlightStrings?: StringNum[]
  /** Show × at the nut for these strings (chord voicings) */
  mutedStrings?: StringNum[]
  /** Called when a fret is clicked / activated with Enter or Space */
  onSelect?: (pos: FretPos) => void
  /** Shape blocks above the neck, aligned to the real fret geometry */
  bands?: FretBand[]
  onBandSelect?: (id: string) => void
  ariaLabel: string
  /**
   * Foreground notes travel to their new frets when the marks change (one note
   * per string per shape works best: chord shapes, triads, boxes).
   */
  glide?: boolean
  size?: 'md' | 'sm'
  className?: string
  /** Hide the inspector line under the neck */
  hideInspector?: boolean
  /** Prompt shown in the inspector before anything is picked */
  hint?: string
  /** Legend under the neck. Default: built from the marks. `false` hides it. */
  legend?: LegendItem[] | false
  /** Show the Notes / Intervals / Both switch on the neck (default: on for full-size boards) */
  labelToggle?: boolean
}

const STRING_GAP = 32
const PAD_T = 26
const PAD_B = 30
const PAD_X = 14
const OPEN_W = 42
const FRET_W0 = 66
/** Gentle taper so higher frets look like a guitar but stay readable. */
const TAPER = 0.978
const DOT_R = 12

interface Geometry {
  width: number
  height: number
  /** x of the left edge of each fret slot */
  left: Map<number, number>
  /** x of the right edge of each fret slot */
  right: Map<number, number>
  center: (fret: number) => number
  /** [minX, maxX] of a fret span, handedness-safe */
  span: (a: number, b: number) => [number, number]
  y: (s: StringNum) => number
  hasNut: boolean
  frets: number[]
}

function buildGeometry(range: FretRange, leftHanded: boolean): Geometry {
  const left = new Map<number, number>()
  const right = new Map<number, number>()
  let x = PAD_X
  const frets: number[] = []
  for (let f = range.start; f <= range.end; f++) {
    const w = f === 0 ? OPEN_W : FRET_W0 * Math.pow(TAPER, f - 1)
    left.set(f, x)
    right.set(f, x + w)
    x += w
    frets.push(f)
  }
  const width = x + PAD_X
  const height = PAD_T + STRING_GAP * 5 + PAD_B
  const mirror = (v: number) => (leftHanded ? width - v : v)
  const L = new Map([...left].map(([f, v]) => [f, mirror(v)]))
  const R = new Map([...right].map(([f, v]) => [f, mirror(v)]))
  return {
    width,
    height,
    left: L,
    right: R,
    center: (f) => mirror((left.get(f)! + right.get(f)!) / 2),
    span: (a, b) => {
      const xs = [L.get(a)!, R.get(a)!, L.get(b)!, R.get(b)!]
      return [Math.min(...xs), Math.max(...xs)]
    },
    y: (s) => PAD_T + (s - 1) * STRING_GAP,
    hasNut: range.start <= 1,
    frets,
  }
}

/** The neck itself — strings, frets, inlays. Memoized: only changes with range/handedness. */
const Neck = memo(function Neck({ g, range, leftHanded, highlightStrings }: { g: Geometry; range: FretRange; leftHanded: boolean; highlightStrings?: StringNum[] }) {
  const top = g.y(1)
  const bottom = g.y(6)
  const [boardLeft, boardRight] = g.span(range.start, range.end)
  const nutX = range.start === 0 ? g.right.get(0)! : g.left.get(range.start)!
  const openArea = range.start === 0
  const [woodLeft, woodRight] = openArea ? [Math.min(nutX, g.right.get(range.end)!), Math.max(nutX, g.right.get(range.end)!)] : [boardLeft, boardRight]
  const midY = (a: StringNum, b: StringNum) => (g.y(a) + g.y(b)) / 2
  const dense = range.end - range.start > 12
  return (
    <g aria-hidden="true">
      <rect x={woodLeft} y={top - 12} width={woodRight - woodLeft} height={bottom - top + 24} rx={3} style={{ fill: 'var(--neck)' }} />
      {/* Bone binding along both edges of the board */}
      <line x1={woodLeft} x2={woodRight} y1={top - 11.5} y2={top - 11.5} strokeWidth={1.4} style={{ stroke: 'var(--neck-binding)', opacity: 0.55 }} />
      <line x1={woodLeft} x2={woodRight} y1={bottom + 11.5} y2={bottom + 11.5} strokeWidth={1.4} style={{ stroke: 'var(--neck-binding)', opacity: 0.55 }} />
      {g.frets
        .filter((f) => f > 0 && (SINGLE_MARKERS.includes(f) || DOUBLE_MARKERS.includes(f)))
        .map((f) =>
          DOUBLE_MARKERS.includes(f) ? (
            <g key={f}>
              <circle cx={g.center(f)} cy={midY(2, 3)} r={4.5} style={{ fill: 'var(--inlay)' }} />
              <circle cx={g.center(f)} cy={midY(4, 5)} r={4.5} style={{ fill: 'var(--inlay)' }} />
            </g>
          ) : (
            <circle key={f} cx={g.center(f)} cy={midY(3, 4)} r={4.5} style={{ fill: 'var(--inlay)' }} />
          ),
        )}
      {g.frets
        .filter((f) => f > 0)
        .map((f) => (
          <line key={f} x1={g.right.get(f)} x2={g.right.get(f)} y1={top - 12} y2={bottom + 12} strokeWidth={1.6} style={{ stroke: 'var(--fret-wire)' }} />
        ))}
      {g.hasNut ? (
        <rect x={nutX - 3} y={top - 12} width={6} height={bottom - top + 24} rx={1} style={{ fill: 'var(--nut)' }} />
      ) : (
        <line x1={nutX} x2={nutX} y1={top - 12} y2={bottom + 12} strokeWidth={1.6} style={{ stroke: 'var(--fret-wire)' }} />
      )}
      {STANDARD_TUNING.map((s) => {
        const dim = highlightStrings && !highlightStrings.includes(s.num)
        const bright = highlightStrings?.includes(s.num)
        return (
          <line
            key={s.num}
            x1={boardLeft - (openArea && !leftHanded ? 0 : 6)}
            x2={boardRight + (openArea && leftHanded ? 0 : 6)}
            y1={g.y(s.num)}
            y2={g.y(s.num)}
            strokeWidth={0.7 + (s.num - 1) * 0.3}
            style={{ stroke: bright ? 'var(--string-hi)' : 'var(--string)', opacity: dim ? 0.28 : 0.9 }}
          />
        )
      })}
      {/* fret numbers */}
      {g.frets.map((f) => {
        const marker = SINGLE_MARKERS.includes(f) || DOUBLE_MARKERS.includes(f)
        if (dense && !marker && f !== 0 && f !== 1 && f !== range.start) return null
        return (
          <text
            key={f}
            x={g.center(f)}
            y={bottom + 28}
            textAnchor="middle"
            style={{ fill: marker ? 'var(--ink-soft)' : 'var(--muted)', fontSize: 11.5, fontWeight: marker ? 650 : 450 }}
          >
            {f === 0 ? 'open' : f}
          </text>
        )
      })}
    </g>
  )
})

const Dot = memo(function Dot({ m, g, rootEmphasis }: { m: FretMark; g: Geometry; rootEmphasis: boolean }) {
  const cx = g.center(m.fret)
  const cy = g.y(m.string)
  const isRoot = m.tone === 'root'
  const emph = m.emphasis ?? 'normal'
  const ghost = emph === 'ghost'
  // Outlined notes stay fully legible; they read as "background" by being hollow, not faded.
  const hollow = emph === 'soft' || m.tone === 'plain'
  const two = !!m.sub && !ghost
  let r = ghost ? 7 : DOT_R + (two ? 1.5 : 0) + (emph === 'strong' ? 0.8 : 0)
  if (isRoot && rootEmphasis && !ghost && !hollow) r += 0.6
  const color = FILL[m.tone]
  // On the dark neck: ghosts are rings in the wood, outlined notes are dark with a coloured edge.
  const shapeStyle = ghost
    ? { fill: 'var(--neck)', stroke: m.tone === 'plain' ? 'var(--neck-ink-soft)' : color, strokeWidth: 1.5, opacity: 0.9 }
    : hollow
      ? { fill: 'var(--neck-hollow)', stroke: m.tone === 'plain' ? 'var(--neck-ink-soft)' : color, strokeWidth: m.tone === 'plain' ? 1.3 : 2.2 }
      : { fill: color, stroke: isRoot && rootEmphasis ? 'var(--neck-ink)' : 'var(--note-edge)', strokeWidth: isRoot && rootEmphasis ? 1.6 : 1 }
  const ink = hollow ? (m.tone === 'plain' ? 'var(--neck-ink-soft)' : 'var(--neck-ink)') : ON_FILL[m.tone]
  const fontSize = m.label.length > 2 ? 9.5 : two ? 10 : 11.5
  const ringR = glyphRadius(SHAPE[m.tone], r) + 4.5
  // Drawn at the origin and moved into place, so a note with a stable key can glide to a new fret.
  return (
    <g className="fret-pos" style={{ transform: `translate(${cx}px, ${cy}px)` }}>
      <g className="fret-dot fret-dot-enter" data-tone={m.tone} data-emphasis={emph}>
        {m.ring === 'target' && <circle r={ringR} fill="none" strokeWidth={2} strokeDasharray="3.2 2.6" style={{ stroke: 'var(--target)' }} />}
        {m.ring === 'shared' && <circle r={ringR} fill="none" strokeWidth={2} style={{ stroke: 'var(--neck-ink)' }} />}
        {m.ring === 'char' && <circle r={ringR} fill="none" strokeWidth={3} style={{ stroke: 'var(--neck-ink)' }} />}
        {m.ring === 'selected' && <circle r={ringR} fill="none" strokeWidth={2} style={{ stroke: 'var(--focus)' }} />}
        <Glyph tone={m.tone} cx={0} cy={0} r={r} style={shapeStyle} />
        {ghost ? null : two ? (
          <>
            <text y={-1.5} textAnchor="middle" style={{ fill: ink, fontSize: 10, fontWeight: 700 }}>
              {m.label}
            </text>
            <text y={8.5} textAnchor="middle" style={{ fill: ink, fontSize: 8.5, fontWeight: 550, opacity: 0.9 }}>
              {m.sub}
            </text>
          </>
        ) : (
          <text y={fontSize * 0.36} textAnchor="middle" style={{ fill: ink, fontSize, fontWeight: 700 }}>
            {m.label}
          </text>
        )}
      </g>
    </g>
  )
})

/**
 * Give foreground notes an identity by string ("the 2nd note on the G string"),
 * so when a shape, box or inversion changes each finger's note travels to its new
 * fret instead of popping. Background (soft/ghost) notes stay keyed by place.
 */
export function withGlide(marks: FretMark[]): FretMark[] {
  const perString = new Map<number, FretMark[]>()
  for (const m of marks) {
    if (m.id || m.emphasis === 'ghost' || m.emphasis === 'soft') continue
    perString.set(m.string, [...(perString.get(m.string) ?? []), m])
  }
  const ids = new Map<FretMark, string>()
  for (const [s, ms] of perString) ms.sort((a, b) => a.fret - b.fret).forEach((m, k) => ids.set(m, `glide-${s}-${k}`))
  return marks.map((m) => (ids.has(m) ? { ...m, id: ids.get(m) } : m))
}

const Dots = memo(function Dots({ marks, g, rootEmphasis }: { marks: FretMark[]; g: Geometry; rootEmphasis: boolean }) {
  // Ghosts first so real notes always paint on top.
  const sorted = useMemo(() => [...marks].sort((a, b) => Number(b.emphasis === 'ghost') - Number(a.emphasis === 'ghost')), [marks])
  return (
    <g pointerEvents="none">
      {sorted.map((m) => (
        // A mark with an identity keeps its element and travels; others are keyed by place.
        <Dot key={m.id ?? `${m.string}:${m.fret}`} m={m} g={g} rootEmphasis={rootEmphasis} />
      ))}
    </g>
  )
})

/** Shape blocks rendered as real buttons, positioned with the neck's own geometry. */
function Bands({ bands, g, onSelect }: { bands: FretBand[]; g: Geometry; onSelect?: (id: string) => void }) {
  // Greedy row packing so overlapping shapes stack instead of colliding.
  const rows: { band: FretBand; row: number }[] = []
  const rowEnds: number[] = []
  for (const b of [...bands].sort((a, c) => a.start - c.start)) {
    let row = rowEnds.findIndex((end) => end < b.start)
    if (row === -1) row = rowEnds.length
    rowEnds[row] = b.end
    rows.push({ band: b, row })
  }
  const rowCount = Math.max(1, rowEnds.length)
  return (
    <div className="relative" style={{ height: rowCount * 30 + 4 }} role="group" aria-label="Shapes along the neck">
      {rows.map(({ band, row }) => {
        const [x1, x2] = g.span(band.start, band.end)
        return (
          <button
            key={band.id}
            type="button"
            onClick={() => onSelect?.(band.id)}
            aria-pressed={band.active}
            aria-label={band.description ?? band.label}
            className={cn(
              'band absolute flex h-[26px] cursor-pointer items-center justify-center rounded-[5px] border text-[13px] font-semibold',
              band.active ? 'z-10 border-accent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-soft hover:border-ink hover:text-ink',
            )}
            style={{ left: `${(x1 / g.width) * 100}%`, width: `${((x2 - x1) / g.width) * 100}%`, top: row * 30 }}
          >
            <span className="truncate px-1">{band.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function LabelModeToggle({ className }: { className?: string }) {
  const { labels, set } = usePrefs()
  return (
    <Segmented<LabelMode>
      label="Label notes with"
      size="sm"
      value={labels}
      onChange={(v) => set('labels', v)}
      className={className}
      options={[
        { value: 'notes', label: 'Notes' },
        { value: 'intervals', label: 'Intervals' },
        { value: 'both', label: 'Both' },
      ]}
    />
  )
}

/**
 * The one fretboard used everywhere. Everything it shows comes in as `marks`;
 * it knows nothing about chords or scales. Tab in, then use arrow keys to walk
 * the neck — the inspector line reads the note under the cursor (or pointer).
 */
export const Fretboard = memo(function Fretboard({
  marks,
  range = FULL_RANGE,
  region,
  regionLabel,
  focus,
  highlightStrings,
  mutedStrings,
  onSelect,
  bands,
  onBandSelect,
  ariaLabel,
  size = 'md',
  className,
  hideInspector,
  hint,
  legend,
  labelToggle = size !== 'sm',
  glide,
}: FretboardProps) {
  const { leftHanded, rootEmphasis, accidentals } = usePrefs()
  // Key on the numbers, not the object: callers often pass a fresh `range` each render.
  const { start: rangeStart, end: rangeEnd } = range
  const stableRange = useMemo(() => ({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd])
  const g = useMemo(() => buildGeometry(stableRange, leftHanded), [stableRange, leftHanded])
  const [cursor, setCursor] = useState<FretPos | null>(null)
  const [hover, setHover] = useState<FretPos | null>(null)
  const inspectorId = useId()
  const scroller = useRef<HTMLDivElement>(null)

  const markAt = useMemo(() => {
    const m = new Map<string, FretMark>()
    for (const mk of marks) m.set(`${mk.string}:${mk.fret}`, mk)
    return m
  }, [marks])

  const visibleMarks = useMemo(() => {
    const inRange = marks.filter((m) => m.fret >= rangeStart && m.fret <= rangeEnd)
    return glide ? withGlide(inRange) : inRange
  }, [marks, rangeStart, rangeEnd, glide])
  const legendItems = useMemo(() => (legend === false ? [] : (legend ?? legendFromMarks(visibleMarks))), [legend, visibleMarks])

  // On narrow screens the neck scrolls: bring the region of interest into view when it changes.
  const focusStart = focus?.start ?? region?.start ?? bands?.find((b) => b.active)?.start
  const focusEnd = focus?.end ?? region?.end ?? bands?.find((b) => b.active)?.end
  useEffect(() => {
    const el = scroller.current
    if (!el || focusStart === undefined || focusEnd === undefined || el.scrollWidth <= el.clientWidth + 4) return
    if (focusStart < rangeStart || focusEnd > rangeEnd) return
    const [x1, x2] = g.span(focusStart, focusEnd)
    const scale = el.scrollWidth / g.width
    const target = ((x1 + x2) / 2) * scale - el.clientWidth / 2
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' })
  }, [focusStart, focusEnd, g, rangeStart, rangeEnd])

  const describe = (p: FretPos) => {
    const mk = markAt.get(`${p.string}:${p.fret}`)
    const fallbackName = pretty(pcName(pcAt(p.string, p.fret), accidentals === 'flat' ? 'flat' : 'sharp'))
    const where = `String ${p.string} (${STANDARD_TUNING[6 - p.string].name}), ${p.fret === 0 ? 'open' : `fret ${p.fret}`}`
    return `${where} · ${mk?.info ?? `${fallbackName} — not part of this view`}`
  }

  const activate = (p: FretPos) => {
    setCursor(p)
    onSelect?.(p)
  }

  const onKey = (e: KeyboardEvent) => {
    const c = cursor ?? { string: 3 as StringNum, fret: Math.max(range.start, Math.min(range.end, 5)) }
    const dirX = leftHanded ? -1 : 1
    let next: FretPos | null = null
    if (e.key === 'ArrowRight') next = { ...c, fret: c.fret + dirX }
    else if (e.key === 'ArrowLeft') next = { ...c, fret: c.fret - dirX }
    else if (e.key === 'ArrowUp') next = { ...c, string: Math.max(1, c.string - 1) as StringNum }
    else if (e.key === 'ArrowDown') next = { ...c, string: Math.min(6, c.string + 1) as StringNum }
    else if ((e.key === 'Enter' || e.key === ' ') && cursor) {
      e.preventDefault()
      onSelect?.(cursor)
      return
    } else if (e.key === 'Escape') {
      setCursor(null)
      return
    }
    if (next) {
      e.preventDefault()
      next.fret = Math.max(range.start, Math.min(range.end, next.fret))
      setCursor(next)
    }
  }

  const fretCount = range.end - range.start + 1
  const minWidth = size === 'sm' ? fretCount * 34 : fretCount * 44
  const shown = hover ?? cursor
  const showRegion = region && region.end >= range.start && region.start <= range.end

  return (
    <div className={cn('w-full', className)}>
      <div
        ref={scroller}
        role="group"
        tabIndex={0}
        aria-label={`${ariaLabel}. Use arrow keys to move along the neck${onSelect ? ', Enter to select' : ''}.`}
        aria-describedby={hideInspector ? undefined : inspectorId}
        onKeyDown={onKey}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCursor(null)
        }}
        className="scroll-x rounded-lg focus-visible:outline-offset-4"
      >
        <div style={{ minWidth, maxWidth: g.width * 1.3 }} className="relative mx-auto">
          {bands && bands.length > 0 && <Bands bands={bands} g={g} onSelect={onBandSelect} />}
          <svg
            viewBox={`0 0 ${g.width} ${g.height}`}
            width="100%"
            style={{ display: 'block' }}
            className="select-none font-sans"
            role="img"
            aria-label={ariaLabel}
            onMouseLeave={() => setHover(null)}
          >
            <Neck g={g} range={stableRange} leftHanded={leftHanded} highlightStrings={highlightStrings} />
            {showRegion && (
              <g aria-hidden="true">
                {(() => {
                  const [x1, x2] = g.span(Math.max(region.start, range.start), Math.min(region.end, range.end))
                  return (
                    <>
                      <rect
                        x={x1 + 1}
                        y={g.y(1) - 15}
                        width={x2 - x1 - 2}
                        height={g.y(6) - g.y(1) + 30}
                        rx={5}
                        style={{ fill: 'var(--region)', stroke: 'var(--region-line)', strokeWidth: 1.4 }}
                      />
                      {regionLabel && !bands && (
                        <text x={(x1 + x2) / 2} y={8} textAnchor="middle" style={{ fill: 'var(--ink-soft)', fontSize: 11, fontWeight: 650 }}>
                          {regionLabel}
                        </text>
                      )}
                    </>
                  )
                })()}
              </g>
            )}
            {mutedStrings?.map((s) => (
              <text
                key={s}
                x={range.start === 0 ? g.center(0) : leftHanded ? g.width - 6 : 6}
                y={g.y(s) + 4}
                textAnchor="middle"
                aria-hidden="true"
                style={{ fill: 'var(--muted)', fontSize: 13, fontWeight: 600 }}
              >
                ×
              </text>
            ))}
            <g>
              {g.frets.flatMap((f) =>
                ([1, 2, 3, 4, 5, 6] as StringNum[]).map((s) => {
                  const [x1, x2] = g.span(f, f)
                  return (
                    <rect
                      key={`${s}:${f}`}
                      x={x1}
                      y={g.y(s) - STRING_GAP / 2}
                      width={x2 - x1}
                      height={STRING_GAP}
                      fill="transparent"
                      className={onSelect ? 'cursor-pointer' : 'cursor-help'}
                      onClick={() => activate({ string: s, fret: f })}
                      onMouseEnter={() => setHover({ string: s, fret: f })}
                    />
                  )
                }),
              )}
            </g>
            <Dots marks={visibleMarks} g={g} rootEmphasis={rootEmphasis} />
            {shown && shown.fret >= range.start && shown.fret <= range.end && (
              <rect
                pointerEvents="none"
                x={g.span(shown.fret, shown.fret)[0] + 2}
                y={g.y(shown.string) - STRING_GAP / 2 + 1}
                width={g.span(shown.fret, shown.fret)[1] - g.span(shown.fret, shown.fret)[0] - 4}
                height={STRING_GAP - 2}
                rx={5}
                fill="none"
                strokeWidth={shown === cursor ? 2 : 1.2}
                style={{ stroke: shown === cursor ? 'var(--focus)' : 'var(--neck-hover)' }}
              />
            )}
          </svg>
        </div>
      </div>
      {(!hideInspector || labelToggle || legendItems.length > 0) && (
        <div className="mt-2 flex flex-col gap-2 px-0.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {!hideInspector && (
              <p id={inspectorId} aria-live="polite" className="min-h-5 text-[13.5px] text-muted">
                {shown ? <span className="text-ink">{describe(shown)}</span> : (hint ?? (onSelect ? 'Tap any fret to pick it.' : 'Point at or tap any fret to read it.'))}
              </p>
            )}
            {legendItems.length > 0 && <Legend items={legendItems} className="mt-1.5" />}
          </div>
          {labelToggle && <LabelModeToggle className="self-start" />}
        </div>
      )}
    </div>
  )
})

/** Small caption slot used under some boards. */
export function NeckCaption({ children }: { children: ReactNode }) {
  return <p className="prose-note mt-3 max-w-[68ch] text-[15.5px]">{children}</p>
}
