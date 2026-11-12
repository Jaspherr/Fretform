import { Link } from 'react-router'
import { ChordEverywhere } from '@/components/ChordEverywhere'
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
      <section className="mx-auto max-w-[1320px] px-4 pb-12 pt-10 sm:px-6 sm:pt-14 lg:px-8" aria-labelledby="hero-title">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-end">
          <h1 id="hero-title" className="max-w-[14ch] text-[2.6rem] leading-[0.98] text-ink sm:text-[4.25rem]" style={{ fontStretch: '78%', fontWeight: 700 }}>
            See the fretboard, not just the shape.
          </h1>
          <p className="prose-note max-w-[46ch] text-[17px]">
            You know chords, a few barre shapes and a scale box or two. Here’s how they connect — on one neck, worked out for any key.
          </p>
        </div>
        <div className="mt-8 rounded-lg border border-line bg-surface p-3 sm:p-5">
          <ChordEverywhere keyPicker />
        </div>
      </section>

      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <section className="border-t border-line py-12" aria-labelledby="questions">
          <h2 id="questions" className="text-[1.75rem] text-ink">
            Start from the question you actually have
          </h2>
          <ul className="mt-6 grid border-t border-line md:grid-cols-2 md:gap-x-10">
            {QUESTIONS.map((x) => (
              <li key={x.q} className="border-b border-line">
                <Link to={x.to} className="group flex items-baseline justify-between gap-4 py-4">
                  <span className="text-[17px] font-semibold leading-snug text-ink group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">“{x.q}”</span>
                  <span className="shrink-0 text-[13.5px] text-muted group-hover:text-ink">{x.tool}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="py-12" aria-labelledby="path">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="path" className="text-[1.75rem] text-ink">
              Or follow the path, one step at a time
            </h2>
            <Link to="/learn" className="font-medium text-ink underline decoration-line-strong decoration-2 underline-offset-4 hover:decoration-ink">
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

        <section className="pb-20 pt-6" aria-labelledby="tools">
          <h2 id="tools" className="text-[1.75rem] text-ink">
            Or go straight to a tool
          </h2>
          <div className="mt-6 grid gap-8 md:grid-cols-3">
            {NAV_GROUPS.map((g) => (
              <section key={g.id} aria-label={g.label}>
                <h3 className="mb-2 text-[14px] font-semibold text-muted">{g.label}</h3>
                <ul className="flex flex-col gap-3">
                  {g.items.map((n) => (
                    <li key={n.to}>
                      <Link to={n.to} className="group block">
                        <span className="text-[17px] font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{n.label}</span>
                        <span className="block text-[14px] text-ink-soft">{n.blurb}</span>
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
  )
}
