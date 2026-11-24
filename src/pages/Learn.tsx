import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { LessonDemo } from '@/components/demos'
import { Page, PageHeader, Panel } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Challenge } from '@/components/Challenge'
import { LESSONS, type LessonTool, getLesson } from '@/content/lessons'
import type { ChallengeKind } from '@/theory/challenges'
import { NotFound } from './Reference'

export function LearnIndex() {
  return (
    <Page>
      <PageHeader eyebrow="Learn" title="From shapes to fretboard">
        Eight steps from “I know some shapes” to “I can see how the neck fits together”. Each step is short, practical and built around an interactive neck.
      </PageHeader>
      <ol className="flex flex-col gap-3">
        {LESSONS.map((l) => (
          <li key={l.slug}>
            <Link
              to={`/learn/${l.slug}`}
              className="group grid gap-2 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong sm:grid-cols-[64px_1fr_auto] sm:items-center"
            >
              <span className="font-mono text-2xl font-semibold text-accent">{l.step}</span>
              <span>
                <span className="block font-semibold text-xl text-ink">{l.title}</span>
                <span className="mt-0.5 block text-[14.5px] text-ink-soft">{l.summary}</span>
              </span>
              <ArrowRight className="hidden size-5 text-muted transition-transform group-hover:translate-x-1 sm:block" />
            </Link>
          </li>
        ))}
      </ol>
    </Page>
  )
}

const CHALLENGE_FOR: Record<LessonTool, ChallengeKind> = {
  notes: 'find-note',
  intervals: 'find-interval',
  'chords-everywhere': 'octave',
  triads: 'find-interval',
  caged: 'octave',
  'scale-overlay': 'scale-tone',
  'chord-tones': 'shared',
  fills: 'target',
  'rhythm-to-lead': 'scale-tone',
}

function StageLabel({ n, label, text }: { n: number; label: string; text?: string }) {
  return (
    <div className="mb-3 mt-10 flex flex-wrap items-baseline gap-x-3 gap-y-1 first-of-type:mt-0">
      <span className="text-[13px] font-semibold text-muted">
        {n} · {label}
      </span>
      {text && <span className="text-[15px] text-ink-soft">{text}</span>}
    </div>
  )
}

export function LessonPage() {
  const { slug } = useParams()
  const lesson = getLesson(slug)
  if (!lesson) return <NotFound />
  const i = LESSONS.indexOf(lesson)
  const prev = LESSONS[i - 1]
  const next = LESSONS[i + 1]
  return (
    <Page>
      <Link to="/learn" className="mb-4 inline-flex items-center gap-1 text-[13.5px] text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" /> Learning path
      </Link>
      <PageHeader eyebrow={lesson.step === '★' ? 'Bonus step' : `Step ${lesson.step}`} title={lesson.title}>
        {lesson.summary}
      </PageHeader>
      <StageLabel n={1} label="Explore" text={lesson.seeing} />
      <Panel>
        <LessonDemo tool={lesson.tool} />
      </Panel>
      <StageLabel n={2} label="Understand" />
      <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {[
          ['Why it matters', lesson.matters],
          ['How to find it', lesson.find],
        ].map(([k, v]) => (
          <div key={k} className="border-l-2 border-line-strong pl-4">
            <dt className="mb-1 text-[14px] font-semibold text-ink">{k}</dt>
            <dd className="prose-note text-[15.5px]">{v}</dd>
          </div>
        ))}
      </dl>
      <StageLabel n={3} label="Apply" text="Find it yourself. Each tap tells you what you hit and why it is (or isn’t) the answer." />
      <Challenge kind={CHALLENGE_FOR[lesson.tool]} title={`Your turn — ${lesson.title.toLowerCase()}`} />
      <p className="prose-note mt-4 max-w-[68ch] border-l-2 border-ink pl-4 text-[16px]">
        <b className="text-[14px] font-semibold text-ink">On your guitar: </b>
        {lesson.tryThis}
      </p>
      <div className="mt-6">
        <Button asChild variant="primary">
          <Link to={lesson.toolLink.to}>
            {lesson.toolLink.label} <ArrowRight />
          </Link>
        </Button>
      </div>
      <nav aria-label="Lesson navigation" className="mt-12 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
        {prev ? (
          <Link to={`/learn/${prev.slug}`} className="rounded-xl border border-line p-4 hover:border-line-strong">
            <span className="text-[12.5px] text-muted">Previous</span>
            <span className="block font-semibold text-lg text-ink">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/learn/${next.slug}`} className="rounded-xl border border-line p-4 text-right hover:border-line-strong">
            <span className="text-[12.5px] text-muted">Next</span>
            <span className="block font-semibold text-lg text-ink">{next.title}</span>
          </Link>
        )}
      </nav>
    </Page>
  )
}
