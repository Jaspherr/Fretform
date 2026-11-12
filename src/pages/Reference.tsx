import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Fretboard } from '@/components/fretboard/Fretboard'
import { IntervalBadge, NoteBadge } from '@/components/fretboard/Legend'
import { mergeMarks, positionMarks, toneMarks, voicingPositions } from '@/components/fretboard/marks'
import { Page, PageHeader, Panel } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { REFERENCE_TOPICS, type ReferenceDemo as Demo, type ReferenceTable, getTopic } from '@/content/reference'
import { usePrefs } from '@/lib/prefs'
import { cagedPositions } from '@/theory/caged'
import { CHORD_QUALITIES, buildChord, chordSymbol, getQuality } from '@/theory/chords'
import { diatonicChords } from '@/theory/diatonic'
import { INTERVAL_NAMES, intervalFamily } from '@/theory/intervals'
import { MODES } from '@/theory/modes'
import { displayNote, pretty } from '@/theory/notes'
import { SCALES, buildScale } from '@/theory/scales'
import { tonesFromPcs } from '@/theory/tones'
import { INVERSION_LABELS, triadInversion, triadsOnStringSet } from '@/theory/triads'

function ReferenceDemo({ demo }: { demo: Demo }) {
  const { labels, accidentals } = usePrefs()
  const content = useMemo(() => {
    const o = { labels, pref: accidentals }
    switch (demo.type) {
      case 'chord': {
        const c = buildChord(demo.root, demo.quality, accidentals)
        return { marks: toneMarks(c.tones, { ...o, range: { start: 0, end: 15 } }), range: { start: 0, end: 15 }, label: pretty(chordSymbol(demo.root, c.quality, accidentals)) }
      }
      case 'scale': {
        const s = buildScale(demo.root, demo.scale, accidentals)
        return { marks: toneMarks(s.tones, o), label: `${pretty(displayNote(s.tones[0].spelled, accidentals))} ${s.def.name}` }
      }
      case 'notes':
        return { marks: toneMarks(tonesFromPcs(0, demo.pcs, accidentals), { ...o, tone: () => 'plain' }), label: 'Natural notes' }
      case 'triad': {
        const c = buildChord(demo.root, demo.quality, accidentals)
        const ts = triadsOnStringSet(demo.root, demo.quality, demo.strings)
        return { marks: mergeMarks(...ts.map((t) => positionMarks(t.strings.map((s, i) => ({ string: s, fret: t.frets[i] })), c.tones, o))), label: `${pretty(chordSymbol(demo.root, c.quality, accidentals))} triads`, strings: ts[0]?.strings }
      }
      case 'caged': {
        const c = buildChord(demo.root, 'major', accidentals)
        const ps = cagedPositions(demo.root)
        return { marks: mergeMarks(...ps.map((p) => positionMarks(voicingPositions(p.voicing.frets), c.tones, o))), range: { start: 0, end: 17 }, label: 'All five CAGED shapes' }
      }
      case 'chord-in-scale': {
        const k = diatonicChords(demo.key, accidentals)[demo.degree - 1]
        const c = buildChord(k.rootPc, k.qualityId, accidentals)
        const s = buildScale(demo.key, 'major', accidentals)
        return {
          marks: mergeMarks(toneMarks(s.tones, { ...o, tone: () => 'plain', emphasis: () => 'soft', range: { start: 0, end: 12 } }), toneMarks(c.tones, { ...o, emphasis: () => 'strong', range: { start: 0, end: 12 } })),
          range: { start: 0, end: 12 },
          label: `${pretty(k.symbol)} inside ${pretty(displayNote(s.tones[0].spelled, accidentals))} major`,
        }
      }
    }
  }, [demo, labels, accidentals])
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <span className="font-semibold text-lg text-ink">{content.label}</span>
      </div>
      <Fretboard marks={content.marks} range={content.range} highlightStrings={'strings' in content ? content.strings : undefined} ariaLabel={content.label} />
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="scroll-x">
      <table className="w-full min-w-[480px] text-left text-[14px]">
        <thead>
          <tr className="border-b border-line text-[12.5px] text-muted">
            {head.map((h) => (
              <th key={h} className="px-2 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/70">
              {r.map((c, j) => (
                <td key={j} className="px-2 py-2 align-top text-ink-soft">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReferenceTableView({ table }: { table: ReferenceTable }) {
  const { accidentals } = usePrefs()
  switch (table) {
    case 'intervals':
      return (
        <Table
          head={['Interval', 'Name', 'Frets', 'From C']}
          rows={['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'].map((iv, semis) => [
            <IntervalBadge key="iv" interval={iv} family={intervalFamily(iv)} />,
            INTERVAL_NAMES[iv],
            semis,
            pretty(displayNote(tonesFromPcs(0, [semis], accidentals)[0].spelled, accidentals)),
          ])}
        />
      )
    case 'chord-formulas':
      return (
        <Table
          head={['Chord', 'Formula', 'In C', 'Sound']}
          rows={CHORD_QUALITIES.filter((q) => q.tier !== 'identify').map((q) => {
            const c = buildChord(0, q.id, accidentals)
            return [
              <Link key="n" to={`/chords?root=C&quality=${q.id}`} className="font-medium text-accent hover:underline">{q.name}</Link>,
              <span key="f" className="flex gap-1">{c.tones.map((t) => <IntervalBadge key={t.interval} interval={t.interval} family={t.family} />)}</span>,
              pretty(chordSymbol(0, q, accidentals)) + ': ' + c.tones.map((t) => pretty(displayNote(t.spelled, accidentals))).join(' '),
              q.sound,
            ]
          })}
        />
      )
    case 'scale-formulas':
      return (
        <Table
          head={['Scale', 'Formula', 'In C']}
          rows={SCALES.filter((s) => s.group !== 'Modes').map((s) => {
            const sc = buildScale(0, s.id, accidentals)
            return [
              <Link key="n" to={`/scales?root=C&scale=${s.id}`} className="font-medium text-accent hover:underline">{s.name}</Link>,
              <span key="f" className="font-mono text-[13px]">{s.formula.join(' ').replace(/b/g, '♭').replace(/#/g, '♯')}</span>,
              sc.tones.map((t) => pretty(displayNote(t.spelled, accidentals))).join(' '),
            ]
          })}
        />
      )
    case 'diatonic': {
      const ch = diatonicChords(7, accidentals)
      return (
        <Table
          head={['Degree', 'Chord in G', 'Quality', 'What it does']}
          rows={ch.map((c) => [<span key="r" className="font-mono">{c.roman}</span>, <span key="s" className="font-semibold text-base text-ink">{pretty(c.symbol)}</span>, getQuality(c.qualityId)!.name, c.function])}
        />
      )
    }
    case 'modes':
      return (
        <Table
          head={['Mode', 'Starts on', 'Formula', 'Characteristic']}
          rows={MODES.map((m) => {
            const s = SCALES.find((x) => x.id === m.scaleId)!
            return [
              <Link key="n" to={`/scales/modes?root=C&mode=${m.scaleId}`} className="font-medium text-accent hover:underline">{m.name}</Link>,
              `Degree ${m.degree} of major`,
              <span key="f" className="font-mono text-[13px]">{s.formula.join(' ').replace(/b/g, '♭').replace(/#/g, '♯')}</span>,
              m.characteristic.join(', ').replace(/b/g, '♭').replace(/#/g, '♯'),
            ]
          })}
        />
      )
    case 'inversions': {
      const c = buildChord(0, 'major', accidentals)
      return (
        <Table
          head={['Inversion', 'Lowest note', 'Order (C major)']}
          rows={(['root', 'first', 'second'] as const).map((inv) => [
            INVERSION_LABELS[inv],
            inv === 'root' ? 'Root' : inv === 'first' ? '3rd' : '5th',
            <span key="o" className="flex gap-1">
              {triadInversion(c.tones, inv).map((t) => (
                <NoteBadge key={t.interval} note={pretty(displayNote(t.spelled, accidentals))} family={t.family} />
              ))}
            </span>,
          ])}
        />
      )
    }
    case 'landmarks':
      return (
        <Table
          head={['Landmark', 'What it tells you']}
          rows={[
            ['Fret 5', 'Same note as the next thinner string played open (G string: fret 4).'],
            ['Fret 7', 'Same note as fret 12 on the next thicker string (B string: fret 8).'],
            ['Fret 12', 'The open strings again, one octave up. Every shape repeats from here.'],
            ['B–C and E–F', 'The only natural notes one fret apart. Every other natural note is two frets from the next.'],
            ['Low E = high e', 'Same note names on the same frets.'],
          ]}
        />
      )
  }
}

export function ReferenceIndex() {
  return (
    <Page>
      <PageHeader eyebrow="Reference" title="Theory reference">
        Short, practical answers. Every topic covers what it is, why a guitarist cares, where it is on the neck, and how to use it.
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REFERENCE_TOPICS.map((t) => (
          <Link key={t.slug} to={`/reference/${t.slug}`} className="group rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
            <span className="flex items-center justify-between font-semibold text-xl text-ink">
              {t.title}
              <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="mt-1 block text-[14px] text-ink-soft">{t.summary}</span>
          </Link>
        ))}
      </div>
    </Page>
  )
}

export function ReferencePage() {
  const { slug } = useParams()
  const topic = getTopic(slug)
  if (!topic) return <NotFound />
  const sections: [string, string][] = [
    ['What is it?', topic.what],
    ['Why does a guitarist care?', topic.why],
    ['Where is it on the fretboard?', topic.where],
    ['How can I use it while playing?', topic.how],
  ]
  return (
    <Page>
      <Link to="/reference" className="mb-4 inline-flex items-center gap-1 text-[13.5px] text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" /> Reference
      </Link>
      <PageHeader eyebrow="Reference" title={topic.title}>
        {topic.summary}
      </PageHeader>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <dl className="flex flex-col gap-5">
          {sections.map(([q, a]) => (
            <div key={q}>
              <dt className="font-semibold text-xl text-ink">{q}</dt>
              <dd className="mt-1 text-[15.5px] leading-relaxed text-ink-soft">{a}</dd>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            {topic.related.map((r) => (
              <Button key={r.to} asChild variant="outline" size="sm">
                <Link to={r.to}>
                  {r.label} <ArrowRight />
                </Link>
              </Button>
            ))}
          </div>
        </dl>
        <Panel className="self-start">
          <ReferenceDemo demo={topic.demo} />
        </Panel>
      </div>
      {topic.table && (
        <Panel className="mt-8">
          <ReferenceTableView table={topic.table} />
        </Panel>
      )}
    </Page>
  )
}

export function NotFound() {
  return (
    <Page>
      <PageHeader eyebrow="404" title="That fret doesn’t exist">
        The page you’re looking for isn’t here. Try search (Ctrl K), or head back to the fretboard.
      </PageHeader>
      <Button asChild variant="primary">
        <Link to="/fretboard">Open the Fretboard Explorer</Link>
      </Button>
    </Page>
  )
}

