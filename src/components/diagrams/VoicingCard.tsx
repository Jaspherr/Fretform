import { cn } from '@/lib/utils'
import { fretsToString } from '@/theory/voicings'
import type { Tone } from '@/theory/tones'
import { ChordDiagram } from './ChordDiagram'

/** One playable shape: diagram + where it sits. Selecting it puts it on the big neck. */
export function VoicingCard({
  title,
  subtitle,
  frets,
  fingers,
  tones,
  showFingers,
  selected,
  onSelect,
  badge,
}: {
  title: string
  subtitle: string
  frets: (number | null)[]
  fingers?: (number | null)[]
  tones: Tone[]
  showFingers?: boolean
  selected?: boolean
  onSelect?: () => void
  badge?: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'group flex cursor-pointer flex-col items-center gap-2 rounded-xl border bg-surface p-3 text-left transition-all hover:border-line-strong hover:shadow-sm',
        selected ? 'border-ink shadow-[0_0_0_1px_var(--ink)]' : 'border-line',
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div>
          <div className="text-[14px] font-semibold leading-tight text-ink">{title}</div>
          <div className="text-[12px] text-muted">{subtitle}</div>
        </div>
        {badge && <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[12.5px] font-semibold text-muted">{badge}</span>}
      </div>
      <ChordDiagram frets={frets} tones={tones} fingers={fingers} showFingers={showFingers} label={`${title}: ${fretsToString(frets)}`} />
      <code className="font-mono text-[12px] tracking-wider text-ink-soft">{fretsToString(frets)}</code>
    </button>
  )
}
