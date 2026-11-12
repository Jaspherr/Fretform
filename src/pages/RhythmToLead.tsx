import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Field, LayerControls, RootSelector } from '@/components/controls'
import { LayeredPosition } from '@/components/LayeredPosition'
import { LEAD_LAYERS, LEAD_ORDER, type LeadLayer } from '@/components/lead-layers'
import { SubNav } from '@/components/layout/AppShell'
import { ControlBar, MoreOptions, Page, PageHeader, Panel, SectionTitle, ToolLink } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { FILL_NAV } from '@/components/layout/sections'
import { Segmented } from '@/components/ui/segmented'
import { usePrefs } from '@/lib/prefs'
import { oneOf, useRootParam, useUrlParam } from '@/lib/url-state'
import { cn } from '@/lib/utils'
import { buildChord, chordSymbol } from '@/theory/chords'
import { pretty, rootSlug } from '@/theory/notes'
import { type CagedShape } from '@/theory/voicings'

export function RhythmToLeadPage() {
  const [keyPc, setKey] = useRootParam('key', 7)
  const [quality, setQuality] = useUrlParam<'major' | 'minor'>('quality', 'major', oneOf(['major', 'minor'] as const))
  const [shape, setShape] = useUrlParam<CagedShape>('shape', 'E', oneOf(['C', 'A', 'G', 'E', 'D'] as const))
  const [active, setActive] = useState<LeadLayer[]>(['chord'])
  const { accidentals } = usePrefs()
  const chord = buildChord(keyPc, quality, accidentals)
  const symbol = pretty(chordSymbol(keyPc, chord.quality, accidentals))
  const latest = [...LEAD_ORDER].reverse().find((l) => active.includes(l)) ?? 'chord'
  const step = LEAD_ORDER.indexOf(latest) + 1
  const total = LEAD_ORDER.length
  const latestInfo = LEAD_LAYERS.find((l) => l.id === latest)

  const goTo = (i: number) => setActive(LEAD_ORDER.slice(0, Math.max(1, Math.min(LEAD_ORDER.length, i))))

  return (
    <Page>
      <SubNav items={FILL_NAV} />
      <PageHeader eyebrow="Connect" title={<>Your {symbol} chord is already a lead position</>}>
        Rhythm and lead don’t live in different places. Start with a barre chord you already play and add one layer at a time — the solo position was under your hand all along.
      </PageHeader>
      <Panel>
        <ControlBar>
          <RootSelector label="Which chord?" value={keyPc} onChange={setKey} />
          <Field label="Major or minor?">
            <Segmented
              label="Major or minor"
              size="sm"
              value={quality}
              onChange={setQuality}
              options={[
                { value: 'major', label: 'Major' },
                { value: 'minor', label: 'Minor' },
              ]}
            />
          </Field>
          <Field label="Which shape do you play it with?">
            <Segmented
              label="CAGED shape"
              size="sm"
              value={shape}
              onChange={setShape}
              options={(['E', 'A', 'C', 'G', 'D'] as const).map((s) => ({ value: s, label: `${s} shape` }))}
            />
          </Field>
        </ControlBar>

        <ol className="mb-4 grid grid-cols-3 gap-1 sm:grid-cols-6" aria-label="Build up the layers step by step">
          {LEAD_LAYERS.map((l, i) => {
            const isOn = active.includes(l.id)
            const isLatest = l.id === latest
            return (
              <li key={l.id}>
                <button
                  onClick={() => goTo(i + 1)}
                  aria-pressed={isOn}
                  aria-current={isLatest ? 'step' : undefined}
                  className={cn(
                    'w-full cursor-pointer border-t-[3px] pt-1.5 text-left text-[13.5px] font-medium transition-colors',
                    isOn ? 'border-ink text-ink' : 'border-line text-muted hover:border-line-strong hover:text-ink-soft',
                  )}
                >
                  {l.label.replace(' · ', '. ')}
                </button>
              </li>
            )
          })}
        </ol>

        <LayeredPosition keyPc={keyPc} quality={quality} shape={shape} active={active} />

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div aria-live="polite" className="fade-in max-w-[62ch]" key={latest}>
            <p className="text-[13px] font-medium text-muted">Step {step} of {total}</p>
            <p className="text-lg font-semibold text-ink">{latestInfo?.title}</p>
            <p className="prose-note mt-0.5">{latestInfo?.text(`${shape}-shape ${symbol}`)}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" disabled={step <= 1} onClick={() => goTo(step - 1)}>
              <ChevronLeft /> Back
            </Button>
            <Button variant="primary" size="sm" disabled={step >= total} onClick={() => goTo(step + 1)}>
              Add next layer <ChevronRight />
            </Button>
          </div>
        </div>
        <MoreOptions label="Mix layers yourself">
          <LayerControls
            label="Layers on the neck"
            layers={LEAD_LAYERS.map((l) => ({ id: l.id, label: l.label.replace(/^\d · /, '') }))}
            active={active}
            onChange={(v) => setActive(v.length ? (LEAD_ORDER.filter((l) => v.includes(l)) as LeadLayer[]) : ['chord'])}
          />
        </MoreOptions>
      </Panel>
      <SectionTitle>What to practise</SectionTitle>
      <ol className="grid gap-x-10 gap-y-5 md:grid-cols-3">
        {[
          `Strum ${symbol} for a bar, then play the triad on the top strings for a bar. Same chord, different texture.`,
          'Turn on the pentatonic. Play a short lick that ends on a root square, then go straight back to strumming the chord.',
          <>Turn on the fill area, then pick a chord change in <ToolLink to={`/fills?key=${rootSlug(keyPc)}`}>Fills between two chords</ToolLink> that uses this part of the neck.</>,
        ].map((t, i) => (
          <li key={i} className="border-l-2 border-ink pl-4">
            <span className="block text-[13px] font-semibold text-muted">Exercise {i + 1}</span>
            <span className="prose-note block">{t}</span>
          </li>
        ))}
      </ol>
    </Page>
  )
}
