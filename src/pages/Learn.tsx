import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { LessonDemo } from '@/components/demos'
import { LessonPanel, Page, PageHeader, Panel } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { LESSONS, getLesson } from '@/content/lessons'
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
      <Panel>
        <LessonDemo tool={lesson.tool} />
      </Panel>
      <LessonPanel className="mt-6" seeing={lesson.seeing} matters={lesson.matters} find={lesson.find} tryThis={lesson.tryThis} />
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
