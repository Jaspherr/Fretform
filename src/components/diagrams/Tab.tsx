import type { FretPos } from '@/theory/fretboard'

const NAMES: Record<number, string> = { 1: 'e', 2: 'B', 3: 'G', 4: 'D', 5: 'A', 6: 'E' }

/** Tiny six-line tab for 2–8 note examples. Plain text so it can be copied. */
export function Tab({ notes, label }: { notes: FretPos[]; label: string }) {
  const cols = notes.map((n) => String(n.fret))
  const widths = cols.map((c) => c.length)
  const lines = [1, 2, 3, 4, 5, 6].map((s) => {
    const cells = notes.map((n, i) => (n.string === s ? cols[i].padEnd(widths[i], '-') : '-'.repeat(widths[i])))
    return `${NAMES[s]}|-${cells.join('--')}-|`
  })
  return (
    <pre aria-label={label} className="scroll-x rounded-lg bg-surface-2/70 px-3 py-2 font-mono text-[12.5px] leading-[1.35] text-ink">
      {lines.join('\n')}
    </pre>
  )
}
