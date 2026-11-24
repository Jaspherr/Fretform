import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { Atlas } from '@/components/atlas/Atlas'
import { NAV_GROUPS } from '@/components/layout/sections'
import { LESSONS } from '@/content/lessons'

/** The six questions the product exists to answer, each deep-linked to a ready-made view. */
const QUESTIONS = [
  { q: 'I know G major here. Where else can I play it?', to: '/chords/elsewhere?root=G&area=5-9', tool: 'Play it somewhere else' },
  { q: 'I found this shape around fret 8. What is it?', to: '/chords/identify?frets=8-10-10-9-8-8', tool: 'Name a shape' },
  { q: 'Show me the C major triads on strings 1–2–3.', to: '/triads?root=C&strings=123', tool: 'Triads' },
  { q: 'I know A minor pentatonic box 1. How do I leave it?', to: '/scales/connect?root=A&scale=minor-pentatonic&from=1', tool: 'Connect the boxes' },
  { q: 'I’m playing G → C. Which notes connect them?', to: '/fills?key=G&from=1&to=4', tool: 'Fills between two chords' },
  { q: 'I know this barre chord. What can I solo with around it?', to: '/fills/rhythm-to-lead?key=G&shape=E', tool: 'Rhythm → lead' },
]

const PATH = LESSONS.filter((l) => l.step !== '★')

export function HomePage() {
  return (
    <div>
      <div className="mx-auto max-w-[1440px] px-4 pb-14 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-x-10 gap-y-2">
          <h1 className="text-[2rem] leading-[1.04] tracking-[-0.03em] text-ink sm:text-[2.75rem]">
            See the fretboard, not just the shape.
          </h1>
          <p className="prose-note max-w-[44ch] text-[16px]">Pick a chord. Then ask the neck one question at a time — and watch the answer appear where you play.</p>
        </header>
        <Atlas />
      </div>

      <div className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
          <section className="py-14" aria-labelledby="questions">
            <h2 id="questions" className="text-[1.75rem] text-ink">
              Or start from the question you actually have
            </h2>
            <ul className="mt-6 grid border-t border-line md:grid-cols-2 md:gap-x-10">
              {QUESTIONS.map((x) => (
                <li key={x.q} className="border-b border-line">
                  <Link to={x.to} className="group flex items-baseline justify-between gap-4 py-4">
                    <span className="text-[17px] font-semibold leading-snug text-ink group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">“{x.q}”</span>
                    <span className="flex shrink-0 items-center gap-1 text-[13.5px] text-muted group-hover:text-ink">
                      {x.tool} <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="pb-14" aria-labelledby="path">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="path" className="text-[1.75rem] text-ink">
                Or follow the path, one step at a time
              </h2>
              <Link to="/learn" className="font-medium text-ink underline decoration-line-control decoration-2 underline-offset-4 hover:decoration-ink">
                See all steps
              </Link>
            </div>
            <ol className="mt-6 grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              {PATH.map((l, i) => (
                <li key={l.slug} className="border-t-2 border-ink pt-3">
                  <Link to={`/learn/${l.slug}`} className="group block">
                    <span className="text-[13px] font-semibold text-muted">Step {i + 1}</span>
                    <span className="mt-0.5 block text-[17px] font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{l.title}</span>
                    <span className="mt-1 block text-[14px] leading-snug text-ink-soft">{l.summary}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="pb-20" aria-labelledby="tools">
            <h2 id="tools" className="text-[1.75rem] text-ink">
              Or go straight to a tool
            </h2>
            <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {NAV_GROUPS.filter((g) => g.id !== 'play').map((g) => (
                <section key={g.id} aria-label={g.label}>
                  <h3 className="mb-2 text-[14px] font-semibold text-muted">{g.label}</h3>
                  <ul className="flex flex-col gap-3">
                    {g.items.map((n) => (
                      <li key={n.to}>
                        <Link to={n.to} className="group block">
                          <span className="font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{n.label}</span>
                          <span className="block text-[14px] leading-snug text-ink-soft">{n.blurb}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
