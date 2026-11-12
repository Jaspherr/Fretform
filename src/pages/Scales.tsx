import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Field, RootSelector, ScaleSelector } from '@/components/controls'
import { Fretboard } from '@/components/fretboard/Fretboard'
import { IntervalBadge, Legend, NoteBadge } from '@/components/fretboard/Legend'
import { mergeMarks, positionMarks, toneMarks } from '@/components/fretboard/marks'
import { SubNav } from '@/components/layout/AppShell'
import { ControlBar, LessonPanel, Page, PageHeader, Panel, SectionTitle, TheoryCard, Tip, ToolLink } from '@/components/layout/page'
import { SCALE_NAV } from '@/components/layout/sections'
import { Segmented } from '@/components/ui/segmented'
import { usePrefs } from '@/lib/prefs'
import { oneOf, useRootParam, useUrlParam } from '@/lib/url-state'
import { cagedPositions, scaleRegion } from '@/theory/caged'
import { type FretPos, type FretRange, pcAt, posKey } from '@/theory/fretboard'
import { parseInterval } from '@/theory/intervals'
import { displayNote, mod12, pretty, rootSlug } from '@/theory/notes'
import { type ScalePattern, connectPatterns, nearestPlacement, pentatonicBoxes, threeNpsPatterns } from '@/theory/patterns'
import { type Scale, SCALES, buildScale, getScale } from '@/theory/scales'
import { isMinorish } from '@/theory/tones'

const SCALE_IDS = SCALES.map((s) => s.id)

function scaleSemis(scale: Scale) {
  return scale.tones.map((t) => mod12(t.pc - scale.rootPc))
}

function ScaleInfo({ scale }: { scale: Scale }) {
  const { accidentals } = usePrefs()
  const rel = scale.def.relative
  const relRoot = rel ? mod12(scale.rootPc + parseInterval(rel.interval).semitones) : null
  const relScale = rel && relRoot !== null ? buildScale(relRoot, rel.scaleId, accidentals) : null
  return (
    <div className="grid gap-3 md:grid-cols-[auto_auto_1fr]">
      <TheoryCard label="Formula">
        <div className="mt-1 flex flex-wrap gap-1">
          {scale.tones.map((t) => (
            <IntervalBadge key={t.interval} interval={t.interval} family={t.family} />
          ))}
        </div>
      </TheoryCard>
      <TheoryCard label="Notes">
        <div className="mt-1 flex flex-wrap gap-1">
          {scale.tones.map((t) => (
            <NoteBadge key={t.interval} note={pretty(displayNote(t.spelled, accidentals))} family={t.family} />
          ))}
        </div>
      </TheoryCard>
      <TheoryCard label="In plain words">
        <p className="text-[14px] text-ink-soft">{scale.def.description}</p>
      </TheoryCard>
      {relScale && rel && (
        <TheoryCard label={rel.label} className="md:col-span-1">
          <Link to={`/scales?root=${rootSlug(relRoot!)}&scale=${rel.scaleId}`} className="font-medium text-accent hover:underline">
            {pretty(displayNote(relScale.tones[0].spelled, accidentals))} {relScale.def.name} →
          </Link>
          <p className="text-[12.5px] text-muted">Same notes, different home.</p>
        </TheoryCard>
      )}
      <TheoryCard label="Where you’ll hear it" className={relScale ? 'md:col-span-2' : 'md:col-span-3'}>
        <p className="text-[14px] text-ink-soft">{scale.def.contexts.join(' · ')}</p>
      </TheoryCard>
    </div>
  )
}

type View = 'full' | 'caged' | 'boxes' | '3nps'

export function ScalesPage() {
  const { labels, accidentals } = usePrefs()
  const [rootPc, setRoot] = useRootParam('root', 0)
  const [scaleId, setScaleId] = useUrlParam('scale', 'major', oneOf(SCALE_IDS))
  const [viewParam, setView] = useUrlParam<View>('view', 'full', oneOf(['full', 'caged', 'boxes', '3nps'] as const))
  const [posParam, setPos] = useUrlParam('pos', '1', (v): v is string => /^[1-7]$/.test(v))
  const def = getScale(scaleId)!
  const scale = useMemo(() => buildScale(rootPc, scaleId, accidentals), [rootPc, scaleId, accidentals])
  const name = `${pretty(displayNote(scale.tones[0].spelled, accidentals))} ${def.name}`

  const views: { value: View; label: string }[] = [
    { value: 'full', label: 'Full neck' },
    ...(def.caged ? [{ value: 'caged' as const, label: 'CAGED positions' }] : []),
    ...(def.pentatonic ? [{ value: 'boxes' as const, label: 'Pentatonic boxes' }] : []),
    ...(def.threeNps ? [{ value: '3nps' as const, label: '3 notes per string' }] : []),
  ]
  const view: View = views.some((v) => v.value === viewParam) ? viewParam : 'full'

  const { patterns, labelsFor } = useMemo(() => {
    if (view === 'boxes') return { patterns: pentatonicBoxes(rootPc, scaleSemis(scale)), labelsFor: (i: number) => `Box ${i + 1}` }
    if (view === '3nps') return { patterns: threeNpsPatterns(rootPc, scaleSemis(scale)), labelsFor: (i: number) => `Pattern ${i + 1}` }
    if (view === 'caged') {
      const pcs = new Set(scale.tones.map((t) => t.pc))
      const caged = cagedPositions(rootPc, isMinorish(def.formula) ? 'minor' : 'major')
      const pats: ScalePattern[] = caged.map((c, i) => {
        const positions = scaleRegion(pcs, c.regionStart, c.regionEnd)
        return { index: i + 1, positions, minFret: c.regionStart, maxFret: c.regionEnd, startDegree: 0 }
      })
      return { patterns: pats, labelsFor: (i: number) => `${caged[i].shape} shape` }
    }
    return { patterns: [] as ScalePattern[], labelsFor: (i: number) => String(i + 1) }
  }, [view, rootPc, scale, def])

  const posIdx = Math.min(Number(posParam) - 1, Math.max(0, patterns.length - 1))
  const pattern = patterns[posIdx] ?? null
  const rootName = pretty(displayNote(scale.tones[0].spelled, accidentals))

  const marks = useMemo(() => {
    if (!pattern) return toneMarks(scale.tones, { labels, pref: accidentals, rootName })
    const inPattern = new Set(pattern.positions.map(posKey))
    const background = toneMarks(scale.tones, { labels, pref: accidentals, rootName, emphasis: () => 'soft', only: (p) => !inPattern.has(posKey(p)) })
    const fg = positionMarks(pattern.positions, scale.tones, { labels, pref: accidentals, rootName })
    return mergeMarks(background, fg)
  }, [pattern, scale, labels, accidentals, rootName])

  const region: FretRange | null = pattern ? { start: pattern.minFret, end: pattern.maxFret } : null

  return (
    <Page>
      <SubNav items={SCALE_NAV} />
      <PageHeader eyebrow="Explore" title={name}>
        {view === 'full' ? 'Every note of the scale on the whole neck. Switch views to break it into positions you can play without shifting.' : 'One position in front, the rest of the scale faded behind it — so you can see where this position sits in the whole.'}
      </PageHeader>
      <Panel>
        <ControlBar>
          <RootSelector label="Which root?" value={rootPc} onChange={setRoot} />
          <ScaleSelector value={scaleId} onChange={setScaleId} />
          <Field label="How do you want to see it?">
            <Segmented label="Scale view" size="sm" value={view} onChange={(v) => { setView(v); setPos('1') }} options={views} />
          </Field>
        </ControlBar>
        <div className="mt-2">
          <Fretboard
            marks={marks}
            region={region}
            bands={patterns.map((p, i) => ({
              id: String(i + 1),
              label: labelsFor(i),
              start: p.minFret,
              end: p.maxFret,
              active: i === posIdx,
              description: `${labelsFor(i)}, frets ${p.minFret} to ${p.maxFret}`,
            }))}
            onBandSelect={setPos}
            ariaLabel={`${name}${pattern ? `, ${labelsFor(posIdx)}` : ''}`}
          />
        </div>
        {view === 'boxes' && (
          <p className="mt-3 text-[13.5px] text-muted">
            Box 1 starts on the root on the low E string. Pentatonic boxes repeat every 12 frets — box 1 at fret {patterns[0]?.minFret} is also at fret {(patterns[0]?.minFret ?? 0) + 12}.{' '}
            <ToolLink to={`/scales/connect?root=${rootSlug(rootPc)}&scale=${scaleId}`}>See how the boxes connect →</ToolLink>
          </p>
        )}
        {view === 'caged' && (
          <p className="mt-3 text-[13.5px] text-muted">
            Each position is the scale notes around one CAGED chord shape (one fret either side). <ToolLink to={`/caged?key=${rootSlug(rootPc)}`}>See the chord inside each one →</ToolLink>
          </p>
        )}
        <div className="mt-6">
          <ScaleInfo scale={scale} />
        </div>
      </Panel>
      <SectionTitle>How to use this</SectionTitle>
      <LessonPanel
        seeing={`${name}: ${def.formula.length} notes per octave, repeated across all six strings.`}
        matters="A scale shape is only useful if you know where its roots are. The squares are your anchor points — every phrase can start or end there."
        find="Use CAGED positions to split the neck into five overlapping zones. Each one wraps around a chord shape you already know."
        tryThis="Play one position slowly from the lowest root to the highest. Then play just the roots, then just the 3rds."
      />
    </Page>
  )
}

/* ---------------------------------------------------------------------------------- */

const PENT_IDS = ['minor-pentatonic', 'major-pentatonic'] as const

export function ConnectPage() {
  const { labels, accidentals } = usePrefs()
  const [rootPc, setRoot] = useRootParam('root', 9)
  const [scaleId, setScaleId] = useUrlParam<(typeof PENT_IDS)[number]>('scale', 'minor-pentatonic', oneOf(PENT_IDS))
  const [fromParam, setFrom] = useUrlParam('from', '1', (v): v is string => /^[1-5]$/.test(v))
  const [show, setShow] = useState<'both' | 'a' | 'b' | 'path'>('both')
  const scale = useMemo(() => buildScale(rootPc, scaleId, accidentals), [rootPc, scaleId, accidentals])
  const boxes = useMemo(() => pentatonicBoxes(rootPc, scaleSemis(scale)), [rootPc, scale])
  const from = Number(fromParam) - 1
  const to = (from + 1) % 5
  const a = boxes[from]
  const b = nearestPlacement(a, boxes[to])
  const conn = connectPatterns(a, b)
  const rootName = pretty(displayNote(scale.tones[0].spelled, accidentals))

  // A practical route: climb box A on the low strings, cross into box B on the high strings.
  const path = useMemo(() => {
    const higher = b.minFret > a.minFret
    const low = (higher ? a : b).positions.filter((p) => p.string >= 4)
    const high = (higher ? b : a).positions.filter((p) => p.string <= 3)
    return [...low, ...high]
  }, [a, b])

  const marks = useMemo(() => {
    const o = { labels, pref: accidentals, rootName }
    if (show === 'path') {
      const pathKeys = new Set(path.map(posKey))
      const rest = [...a.positions, ...b.positions].filter((p) => !pathKeys.has(posKey(p)))
      return mergeMarks(positionMarks(rest, scale.tones, { ...o, emphasis: () => 'soft' }), positionMarks(path, scale.tones, { ...o, emphasis: () => 'strong' }))
    }
    const sharedKeys = new Set(conn.shared.map(posKey))
    const layerA = positionMarks(conn.onlyA, scale.tones, { ...o, emphasis: () => (show === 'b' ? 'ghost' : 'normal') })
    const layerB = positionMarks(conn.onlyB, scale.tones, { ...o, emphasis: () => (show === 'b' ? 'normal' : show === 'a' ? 'ghost' : 'soft') })
    const shared = positionMarks(conn.shared, scale.tones, { ...o, emphasis: () => 'strong', ring: (_t, p) => (sharedKeys.has(posKey(p)) ? 'shared' : undefined) })
    return mergeMarks(layerA, layerB, shared)
  }, [show, path, a, b, conn, scale, labels, accidentals, rootName])

  const range: FretRange = { start: Math.max(0, Math.min(a.minFret, b.minFret) - 1), end: Math.min(22, Math.max(a.maxFret, b.maxFret) + 1) }
  const describe = (p: FretPos) => `string ${p.string}, fret ${p.fret}`

  return (
    <Page>
      <SubNav items={SCALE_NAV} />
      <PageHeader eyebrow="Scales" title="Connect the boxes">
        Pentatonic boxes aren’t separate rectangles. Each one shares a whole column of notes with its neighbour — those shared notes are the doorways between positions.
      </PageHeader>
      <Panel>
        <ControlBar>
          <RootSelector value={rootPc} onChange={setRoot} />
        </ControlBar>
        <ControlBar>
          <Field label="Scale">
            <Segmented
              label="Scale"
              size="sm"
              value={scaleId}
              onChange={setScaleId}
              options={[
                { value: 'minor-pentatonic', label: 'Minor pentatonic' },
                { value: 'major-pentatonic', label: 'Major pentatonic' },
              ]}
            />
          </Field>
          <Field label="Connect">
            <Segmented
              label="Boxes to connect"
              size="sm"
              value={fromParam}
              onChange={setFrom}
              options={[0, 1, 2, 3, 4].map((i) => ({ value: String(i + 1), label: `${i + 1} → ${((i + 1) % 5) + 1}` }))}
            />
          </Field>
          <Field label="Show">
            <Segmented
              label="Show"
              size="sm"
              value={show}
              onChange={setShow}
              options={[
                { value: 'both', label: 'Both boxes' },
                { value: 'a', label: `Box ${from + 1}` },
                { value: 'b', label: `Box ${to + 1}` },
                { value: 'path', label: 'A path through' },
              ]}
            />
          </Field>
        </ControlBar>
        <Tip id="connect-boxes">
          Solid notes belong to box {from + 1}, outlined notes to box {to + 1}. The ringed notes belong to <b>both</b> — when you reach one, you can keep going in either box.
        </Tip>
        <Fretboard legend={false} marks={marks} range={range} region={{ start: b.minFret, end: b.maxFret }} regionLabel={`Box ${to + 1}`} ariaLabel={`${rootName} ${scale.def.name}, box ${from + 1} to box ${to + 1}`} />
        <Legend
          className="mt-2"
          items={[
            { tone: 'root', label: 'Root' },
            { tone: 'other', label: `Box ${from + 1} only` },
            { tone: 'other', label: `Box ${to + 1} only`, soft: true },
            { tone: 'other', label: 'Shared (doorway)', ring: 'shared' },
          ]}
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <TheoryCard label="Shared notes">
            <p className="text-[14px] text-ink-soft">
              {conn.shared.length} notes. On each string, the highest note of the lower box is the lowest note of the higher box.
            </p>
          </TheoryCard>
          <TheoryCard label="Transition point">
            <p className="text-[14px] text-ink-soft">
              The “path” view climbs box {b.minFret > a.minFret ? from + 1 : to + 1} on strings 6–4 and switches to box {b.minFret > a.minFret ? to + 1 : from + 1} on string 3 — a shift of about {Math.abs(b.minFret - a.minFret)} frets with the hand, no jump.
            </p>
          </TheoryCard>
          <TheoryCard label="Roots in both">
            <p className="text-[14px] text-ink-soft">
              {conn.shared.some((p) => pcAt(p.string, p.fret) === scale.rootPc)
                ? 'A root sits right on the border, so you can land on it from either box.'
                : 'No root is shared here — aim for the nearest root square in the box you arrive in.'}
            </p>
          </TheoryCard>
        </div>
        <p className="sr-only">Shared positions: {conn.shared.map(describe).join('; ')}</p>
      </Panel>
      <SectionTitle>How to use this</SectionTitle>
      <LessonPanel
        seeing={`Two neighbouring ${scale.def.name.toLowerCase()} boxes at once, with the notes they share ringed.`}
        matters="If you only know box 1, every solo sounds like box 1. Knowing the doorways lets you drift up the neck mid-phrase without stopping."
        find="Each string has one shared note between neighbouring boxes. Slide into it, or use it as the pivot for a position shift."
        tryThis="Play box 1 up to the G string, slide into box 2 on the shared note, finish ascending in box 2 — then reverse it coming down."
      />
    </Page>
  )
}

