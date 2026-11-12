import { CornerDownLeft, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { search } from '@/content/search'
import { cn } from '@/lib/utils'

const SUGGESTIONS = ['G chord', 'A minor pentatonic', 'Dorian', 'triads', 'CAGED', 'chord tones', 'what chord is this']

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const results = useMemo(() => search(q === 'what chord is this' ? 'identify chord' : q), [q])

  const changeQuery = (v: string) => {
    setQ(v)
    setActive(0)
  }
  const handleOpenChange = (o: boolean) => {
    if (!o) changeQuery('')
    onOpenChange(o)
  }

  const go = (to: string) => {
    handleOpenChange(false)
    navigate(to)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0" aria-describedby="search-desc">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription id="search-desc" className="sr-only">
          Search chords, scales, modes, lessons and tools. Use arrow keys to pick a result.
        </DialogDescription>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => changeQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(results.length - 1, a + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(0, a - 1))
              } else if (e.key === 'Enter' && results[active]) {
                go(results[active].to)
              }
            }}
            placeholder="Try “C major”, “A minor pentatonic”, “Dorian”…"
            className="h-14 flex-1 bg-transparent pr-8 text-[16px] text-ink outline-none placeholder:text-muted"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={results[active] ? `sr-${active}` : undefined}
          />
        </div>
        {q.trim() === '' ? (
          <div className="p-4">
            <p className="mb-2 text-[12.5px] font-semibold text-muted">Try</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => changeQuery(s)} className="cursor-pointer rounded-full border border-line bg-surface-2/60 px-3 py-1 text-[13px] text-ink-soft hover:text-ink">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <p className="p-6 text-sm text-muted">Nothing matches “{q}”. Try a chord name, a scale, or a topic like “inversions”.</p>
        ) : (
          <ul id="search-results" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
            {results.map((r, i) => (
              <li
                key={r.to + r.title}
                id={`sr-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.to)}
                className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5', i === active && 'bg-surface-2')}
              >
                <span className="text-[14.5px] text-ink">{r.title}</span>
                <span className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
                  {r.kind}
                  {i === active && <CornerDownLeft className="size-3.5" />}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
