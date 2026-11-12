import { useMemo } from 'react'
import { Link } from 'react-router'
import { Field, RootSelector } from '@/components/controls'
import { Fretboard } from '@/components/fretboard/Fretboard'
import { IntervalBadge, Legend } from '@/components/fretboard/Legend'
import { type FretMark, labelTone, mergeMarks, toneMarks } from '@/components/fretboard/marks'
import { SubNav } from '@/components/layout/AppShell'
import { ControlBar, LessonPanel, Page, PageHeader, Panel, SectionTitle, TheoryCard } from '@/components/layout/page'
import { SCALE_NAV } from '@/components/layout/sections'
import { Segmented } from '@/components/ui/segmented'
import { usePrefs } from '@/lib/prefs'
import { oneOf, useRootParam, useUrlParam } from '@/lib/url-state'
import { cn } from '@/lib/utils'
import { getQuality } from '@/theory/chords'
import { positionsOf, pcAt } from '@/theory/fretboard'
import { intervalName, prettyInterval } from '@/theory/intervals'
import { MODES, MODE_BY_SCALE, parentMajorRoot } from '@/theory/modes'
import { displayNote, pretty, rootSlug } from '@/theory/notes'
import { buildScale, getScale, parentMajorSpelling } from '@/theory/scales'

type Compare = 'compare' | 'mode' | 'parent'

export function ModesPage() {
  const { labels, accidentals } = usePrefs()
  const [rootPc, setRoot] = useRootParam('root', 2)
  const [modeId, setModeId] = useUrlParam('mode', 'dorian', oneOf(MODES.map((m) => m.scaleId)))
  const [view, setView] = useUrlParam<Compare>('view', 'compare', oneOf(['compare', 'mode', 'parent'] as const))
  const mode = MODE_BY_SCALE[modeId]
  const scale = useMemo(() => buildScale(rootPc, modeId, accidentals), [rootPc, modeId, accidentals])
  // The comparison scale and the parent key are spelled from the mode's own root,
  // so "D♯ Locrian" sits next to "D♯ natural minor" and "parent E major".
  const compare = useMemo(() => buildScale(rootPc, mode.compareTo, accidentals, scale.tones[0].spelled), [rootPc, mode, accidentals, scale])
  const parentPc = parentMajorRoot(rootPc, mode)
  const parent = useMemo(
    () => buildScale(parentPc, 'major', accidentals, accidentals === 'auto' ? parentMajorSpelling(scale.tones[0].spelled, mode) : undefined),
    [parentPc, accidentals, scale, mode],
  )
  const rootName = pretty(displayNote(scale.tones[0].spelled, accidentals))
  const parentName = pretty(displayNote(parent.tones[0].spelled, accidentals))
  const compareName = getScale(mode.compareTo)!.name
  const chordQ = getQuality(mode.chordQualityId)!
  // Named from the mode root so the chord matches the scale: D♯m7♭5 over D♯ Locrian, not E♭m7♭5.
  const homeChord = rootName + chordQ.symbol

  // Which degrees differ from the comparison scale (same degree number, different interval).
  const changed = useMemo(() => {
    const out: { degree: number; mode: string; compare: string }[] = []
    scale.tones.forEach((t, i) => {
      const c = compare.tones[i]
      if (c && c.interval !== t.interval) out.push({ degree: i + 1, mode: t.interval, compare: c.interval })
    })
    return out
  }, [scale, compare])
  const changedIntervals = useMemo(() => new Set(changed.map((c) => c.mode)), [changed])

  const marks = useMemo(() => {
    if (view === 'parent') {
      // Parent-scale view: same notes, but the mode's root is the square.
      return toneMarks(scale.tones, { labels, pref: accidentals, rootName })
    }
    const main = toneMarks(scale.tones, {
      labels,
      pref: accidentals,
      rootName,
      emphasis: (t) => (view === 'compare' && !changedIntervals.has(t.interval) ? 'soft' : 'normal'),
      ring: (t) => (changedIntervals.has(t.interval) || mode.characteristic.includes(t.interval) ? 'char' : undefined),
    })
    if (view !== 'compare') return main
    // Ghost the notes the comparison scale would have played instead.
    const replaced = compare.tones.filter((t) => changed.some((c) => c.compare === t.interval))
    const ghosts: FretMark[] = positionsOf(replaced.map((t) => t.pc)).map((p) => {
      const t = replaced.find((x) => x.pc === pcAt(p.string, p.fret))!
      return { ...p, ...labelTone(t, labels, accidentals), tone: t.family, emphasis: 'ghost', info: `${compareName} would have ${prettyInterval(t.interval)} here` }
    })
    return mergeMarks(ghosts, main)
  }, [view, scale, compare, changed, changedIntervals, mode, labels, accidentals, rootName, compareName])

  return (
    <Page>
      <SubNav items={SCALE_NAV} />
      <PageHeader eyebrow="Modes" title="Modes made visual">
        A mode is a familiar scale with one or two notes changed. Instead of seven new patterns, see exactly which note moves and why it changes the sound.
      </PageHeader>
      <Panel>
        <ControlBar>
          <RootSelector value={rootPc} onChange={setRoot} label="Mode root" />
        </ControlBar>
        <ControlBar>
          <Field label="Mode">
            <Segmented label="Mode" size="sm" value={modeId} onChange={setModeId} options={MODES.map((m) => ({ value: m.scaleId, label: m.name }))} />
          </Field>
          <Field label="View">
            <Segmented
              label="View"
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: 'compare', label: `vs ${compareName}` },
                { value: 'mode', label: 'Mode only' },
                { value: 'parent', label: `Parent: ${parentName} major` },
              ]}
            />
          </Field>
        </ControlBar>

        <h2 className="mb-4 text-2xl font-medium">
          {rootName} {mode.name} <span className="text-lg font-normal text-muted">— {mode.feel.toLowerCase()}</span>
        </h2>
        <div className="grid gap-3 md:grid-cols-4">
          <TheoryCard label="Parent major scale">
            <Link to={`/scales?root=${rootSlug(parentPc)}&scale=major`} className="font-medium text-accent hover:underline">
              {parentName} major
            </Link>
            <p className="text-[12.5px] text-muted">Starting on its {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'][mode.degree - 1]} note</p>
          </TheoryCard>
          <TheoryCard label="Characteristic note">
            <div className="flex flex-wrap items-center gap-2">
              {mode.characteristic.map((c) => {
                const t = scale.tones.find((x) => x.interval === c)!
                return <IntervalBadge key={c} interval={c} family={t.family} className="ring-2 ring-accent ring-offset-1 ring-offset-surface" />
              })}
              <span className="text-[13px] text-ink-soft">{mode.characteristic.map((c) => intervalName(c)).join(', ')}</span>
            </div>
          </TheoryCard>
          <TheoryCard label="Home chord">
            <Link to={`/chords?root=${rootSlug(rootPc)}&quality=${chordQ.id}`} className="font-semibold text-lg text-ink hover:underline">
              {homeChord}
            </Link>
            <p className="text-[12.5px] text-muted">{chordQ.name}</p>
          </TheoryCard>
          <TheoryCard label="Think of it as">
            <p className="text-[13.5px] text-ink-soft">{mode.tip}</p>
          </TheoryCard>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-y-1 text-center text-[14px]">
            <caption className="sr-only">Comparison of {mode.name} with {compareName}</caption>
            <tbody>
              {[
                { label: `${rootName} ${mode.name}`, tones: scale.tones, isMode: true },
                { label: `${rootName} ${compareName}`, tones: compare.tones, isMode: false },
              ].map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="pr-3 text-left text-[13px] font-medium text-ink-soft">{row.label}</th>
                  {row.tones.map((t, i) => {
                    const diff = changed.some((c) => c.degree === i + 1)
                    return (
                      <td key={i} className={cn('rounded-md px-1 py-1.5', diff && (row.isMode ? 'bg-accent-soft' : 'bg-surface-2'))}>
                        <div className={cn('font-mono text-[13px]', diff ? 'font-bold text-ink' : 'text-muted')}>{prettyInterval(t.interval)}</div>
                        <div className={cn(diff ? 'font-semibold text-ink' : 'text-ink-soft')}>{pretty(displayNote(t.spelled, accidentals))}</div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[13px] text-muted">
            {changed.length === 0
              ? `${mode.name} is identical to ${compareName} — it’s the same scale under its modal name.`
              : `Only ${changed.length === 1 ? 'one note differs' : `${changed.length} notes differ`}: ${changed.map((c) => `${prettyInterval(c.compare)} → ${prettyInterval(c.mode)}`).join(', ')}.`}
          </p>
        </div>

        <div className="mt-6">
          <Fretboard legend={false} marks={marks} ariaLabel={`${rootName} ${mode.name}${view === 'compare' ? ` compared with ${compareName}` : ''}`} />
          <Legend
            className="mt-2"
            items={
              view === 'compare'
                ? [
                    { tone: 'root', label: 'Root' },
                    { tone: 'other', label: 'The note that changed', ring: 'char' },
                    { tone: 'other', label: `Same as ${compareName}`, soft: true },
                    { tone: 'plain', label: `${compareName}’s note (outline)` },
                  ]
                : [
                    { tone: 'root', label: `Root (${rootName})` },
                    { tone: 'third', label: '3rd' },
                    { tone: 'fifth', label: '5th' },
                    { tone: 'seventh', label: '7th' },
                    { tone: 'other', label: 'Characteristic note', ring: 'char' },
                  ]
            }
          />
          {view === 'parent' && (
            <p className="mt-3 text-[14px] text-ink-soft">
              These are exactly the notes of {parentName} major — the shapes you know for {parentName} major work unchanged. The only difference is where “home” is: the squares now sit on {rootName}.
            </p>
          )}
        </div>
      </Panel>

      <SectionTitle sub="Every mode compared with the scale it’s closest to.">All seven at a glance</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MODES.map((m) => {
          const s = buildScale(rootPc, m.scaleId, accidentals)
          return (
            <Link
              key={m.scaleId}
              to={`/scales/modes?root=${rootSlug(rootPc)}&mode=${m.scaleId}`}
              className={cn('rounded-xl border bg-surface p-4 hover:border-line-strong', m.scaleId === modeId ? 'border-ink' : 'border-line')}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-lg text-ink">{m.name}</span>
                <span className="text-[12px] text-muted">{m.feel}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.tones.map((t) => (
                  <IntervalBadge key={t.interval} interval={t.interval} family={t.family} className={cn('h-5 min-w-5 text-[11px]', m.characteristic.includes(t.interval) && 'ring-2 ring-accent')} />
                ))}
              </div>
            </Link>
          )
        })}
      </div>

      <SectionTitle>How to use this</SectionTitle>
      <LessonPanel
        seeing={`${rootName} ${mode.name} on the neck, with the note that separates it from ${compareName} ringed.`}
        matters="Modes only sound like themselves when you lean on their characteristic note over the right chord. Otherwise you’re just playing the parent major scale."
        find={`Use the shapes of ${parentName} major, but treat ${rootName} as home.`}
        tryThis={`Over a ${homeChord} chord (or a drone on ${rootName}), play ${compareName}, then ${mode.name}. Hold the changed note and listen.`}
      />
    </Page>
  )
}
