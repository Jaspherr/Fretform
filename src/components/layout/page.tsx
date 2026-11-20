import { ChevronDown, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { usePrefs } from '@/lib/prefs'
import { cn } from '@/lib/utils'
import { rootSlug } from '@/theory/notes'

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1320px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8', className)}>{children}</div>
}

/** Tool title: a short, plain heading and one sentence of context. The neck does the rest. */
export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: string; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="mb-1 text-[13px] font-medium text-muted">{eyebrow}</p>}
        <h1 className="text-[1.75rem] leading-[1.1] text-ink sm:text-[2.25rem]">{title}</h1>
        {children && <div className="prose-note mt-2 max-w-[66ch]">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

/**
 * The workspace a neck sits on. No card: the ebony neck carries the weight, so
 * a section is just a rule and some room — the same as the home page.
 */
export function Panel({ children, className, title, aside }: { children: ReactNode; className?: string; title?: ReactNode; aside?: ReactNode }) {
  return (
    <section className={cn('border-t border-line pt-5 sm:pt-6', className)}>
      {(title || aside) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          {title && <h2 className="text-xl text-ink">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  )
}

/** Row of question-style controls above a neck. */
export function ControlBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-4 flex flex-wrap items-end gap-x-6 gap-y-3', className)}>{children}</div>
}

/**
 * Progressive disclosure for secondary controls. Native <details>, so it's
 * keyboard- and screen-reader-friendly without extra state.
 */
export function MoreOptions({ children, label = 'More options', defaultOpen }: { children: ReactNode; label?: string; defaultOpen?: boolean }) {
  return (
    <details className="group mb-4" open={defaultOpen}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md py-1 text-[13.5px] font-medium text-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden">
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        {label}
      </summary>
      <div className="fade-in mt-3 flex flex-wrap items-end gap-x-6 gap-y-3 border-l-2 border-line pl-4">{children}</div>
    </details>
  )
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4 mt-14">
      <h2 className="text-[1.5rem] text-ink">{children}</h2>
      {sub && <p className="prose-note mt-1 max-w-[66ch]">{sub}</p>}
    </div>
  )
}

/** The four-part teaching notes, laid out like margin notes rather than cards. */
export function LessonPanel({
  seeing,
  matters,
  find,
  tryThis,
  className,
}: {
  seeing: ReactNode
  matters: ReactNode
  find?: ReactNode
  tryThis?: ReactNode
  className?: string
}) {
  const items = [
    ['What you’re looking at', seeing],
    ['Why it matters', matters],
    ['Find it on the neck', find],
    ['Try this', tryThis],
  ] as const
  return (
    <dl className={cn('grid gap-x-10 gap-y-6 sm:grid-cols-2', className)}>
      {items
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className={cn('border-l-2 pl-4', k === 'Try this' ? 'border-ink' : 'border-line-strong')}>
            <dt className="mb-1 text-[14px] font-semibold text-ink">{k}</dt>
            <dd className="prose-note text-[15.5px]">{v}</dd>
          </div>
        ))}
    </dl>
  )
}

export function TheoryCard({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-md border border-line bg-bg/60 px-3.5 py-2.5', className)}>
      <div className="text-[12.5px] font-medium text-muted">{label}</div>
      <div className="mt-1 text-ink">{children}</div>
    </div>
  )
}

/** A dismissible tip; dismissal is remembered. */
export function Tip({ id, children }: { id: string; children: ReactNode }) {
  const { dismissedTips, dismissTip } = usePrefs()
  if (dismissedTips.includes(id)) return null
  return (
    <div className="fade-in mb-4 flex items-start gap-3 border-l-2 border-ink bg-surface-2/50 py-2 pl-3 pr-2 text-[14px] text-ink-soft">
      <div className="flex-1">{children}</div>
      <button onClick={() => dismissTip(id)} aria-label="Dismiss tip" className="cursor-pointer rounded p-1 text-muted hover:text-ink">
        <X className="size-4" />
      </button>
    </div>
  )
}

export function ToolLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-medium text-ink underline decoration-line-strong decoration-2 underline-offset-4 hover:decoration-ink">
      {children}
    </Link>
  )
}

/** "Where next" links at the end of a tool — phrased as the guitarist's next question. */
export function NextSteps({ items }: { items: { to: string; q: string; a: string }[] }) {
  return (
    <nav aria-label="Where next" className="mt-14 border-t border-line pt-6">
      <h2 className="mb-3 text-[15px] font-semibold text-ink">Where next</h2>
      <ul className="grid gap-x-8 gap-y-3 md:grid-cols-3">
        {items.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="group block">
              <span className="font-semibold text-ink underline decoration-line-strong decoration-2 underline-offset-4 group-hover:decoration-ink">{l.q}</span>
              <span className="mt-0.5 block text-[14px] text-muted">{l.a}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

const NECK_QUALITIES = ['major', 'minor', 'dom7', 'maj7', 'm7']

/**
 * Back to the neck: open the home instrument on the same chord, at the question
 * this tool goes deeper on. Every tool is a detour from there, not an island.
 */
export function OnTheNeck({ rootPc, quality, step, label }: { rootPc: number; quality: string; step: 'notes' | 'shape' | 'triad' | 'scale' | 'move'; label: string }) {
  const q = NECK_QUALITIES.includes(quality) ? quality : quality === 'dim' || quality === 'm7b5' ? 'minor' : 'major'
  const to = `/?chord=${rootSlug(rootPc)}${q === 'major' ? '' : `&q=${q}`}&step=${step}`
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-[13.5px] font-medium text-ink hover:border-ink">
      <span aria-hidden="true" className="inline-block size-2.5 rounded-[3px] bg-[var(--neck)]" />
      {label}
    </Link>
  )
}
