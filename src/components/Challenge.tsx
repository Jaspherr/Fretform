import { Check, RefreshCw, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Fretboard } from '@/components/fretboard/Fretboard'
import type { FretMark } from '@/components/fretboard/marks'
import { Button } from '@/components/ui/button'
import { type ChallengeKind, checkTap, makeChallenge, seededRng } from '@/theory/challenges'
import { type FretPos, pcAt } from '@/theory/fretboard'
import { pcName, pretty } from '@/theory/notes'

/**
 * "Now you find it." A one-question challenge on the neck: tap an answer, get a
 * musical explanation of what you tapped. No points — the reward is knowing why.
 */
export function Challenge({ kind, title = 'Your turn' }: { kind: ChallengeKind; title?: string }) {
  const [seed, setSeed] = useState(1)
  const [taps, setTaps] = useState<{ pos: FretPos; correct: boolean; text: string }[]>([])
  const [revealed, setRevealed] = useState(false)
  const c = useMemo(() => makeChallenge(kind, seededRng(seed * 7919 + kind.length)), [kind, seed])
  const solved = taps.some((t) => t.correct)
  const last = taps[taps.length - 1]

  const name = (p: FretPos) => pretty(pcName(pcAt(p.string, p.fret), 'sharp'))
  const marks: FretMark[] = [
    ...c.given.map((p) => ({ ...p, label: name(p), tone: 'root' as const, emphasis: 'normal' as const, info: 'Given' })),
    ...(revealed || solved ? c.answers.filter((a) => !taps.some((t) => t.correct && t.pos.string === a.string && t.pos.fret === a.fret)).map((p) => ({ ...p, label: name(p), tone: 'target' as const, emphasis: 'soft' as const, ring: 'target' as const, info: 'An answer' })) : []),
    ...taps.map((t) => ({ ...t.pos, label: name(t.pos), tone: t.correct ? ('target' as const) : ('plain' as const), emphasis: t.correct ? ('strong' as const) : ('soft' as const), ring: t.correct ? ('shared' as const) : undefined, info: t.text })),
  ]

  const tap = (p: FretPos) => {
    if (solved) return
    const r = checkTap(c, p)
    setTaps((ts) => [...ts.filter((t) => !(t.pos.string === p.string && t.pos.fret === p.fret)), { pos: p, correct: r.correct, text: r.explanation }])
  }
  const another = () => {
    setSeed((s) => s + 1)
    setTaps([])
    setRevealed(false)
  }

  return (
    <section aria-label={title} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-muted">{title}</p>
          <p className="mt-0.5 text-[17px] font-semibold text-ink">{c.prompt}</p>
        </div>
        <div className="flex gap-2">
          {!solved && !revealed && taps.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setRevealed(true)}>
              Show me
            </Button>
          )}
          <Button size="sm" onClick={another}>
            <RefreshCw /> Another one
          </Button>
        </div>
      </div>
      <Fretboard
        marks={marks}
        range={{ start: 0, end: 12 }}
        region={c.range}
        regionLabel="Answer here"
        highlightStrings={c.onString ? [c.onString] : undefined}
        onSelect={tap}
        legend={false}
        hint="Tap a fret to answer."
        ariaLabel={c.prompt}
      />
      <p role="status" className="mt-3 flex min-h-6 items-center gap-2 text-[15px]">
        {last ? (
          <>
            {last.correct ? <Check className="size-4 text-success" aria-hidden="true" /> : <X className="size-4 text-error" aria-hidden="true" />}
            <span className={last.correct ? 'font-semibold text-ink' : 'text-ink-soft'}>{last.text}</span>
          </>
        ) : revealed ? (
          <span className="text-ink-soft">The dashed rings are every right answer in the highlighted frets.</span>
        ) : null}
      </p>
    </section>
  )
}
