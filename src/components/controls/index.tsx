import { useState, type ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { ChipToggles, Segmented } from '@/components/ui/segmented'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePrefs, type LabelMode } from '@/lib/prefs'
import { cn } from '@/lib/utils'
import { EXPLORER_QUALITIES } from '@/theory/chords'
import { NECK_REGIONS, type NeckRegionId, STRING_SETS, type StringSetId } from '@/theory/fretboard'
import { type PitchClass, ROOT_OPTIONS } from '@/theory/notes'
import { SCALES } from '@/theory/scales'
import { CAGED_ORDER, type CagedShape } from '@/theory/voicings'
import { COMMON_PROGRESSIONS } from '@/theory/diatonic'

/** A labeled control group. */
export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      {children}
    </div>
  )
}

export function RootSelector({ value, onChange, label = 'Root' }: { value: PitchClass; onChange: (pc: PitchClass) => void; label?: string }) {
  return (
    <Field label={label} className="max-w-full">
      <Segmented
        label={label}
        size="sm"
        className="scroll-x max-w-full flex-nowrap"
        value={String(value)}
        onChange={(v) => onChange(Number(v))}
        options={ROOT_OPTIONS.map((o) => ({ value: String(o.pc), label: o.label }))}
      />
    </Field>
  )
}

const COMMON_QUALITIES = EXPLORER_QUALITIES.filter((q) => q.tier === 'common')
const MORE_QUALITIES = EXPLORER_QUALITIES.filter((q) => q.tier === 'more')

/** Common qualities up front; the rest in a "More" menu. */
export function ChordSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const isMore = MORE_QUALITIES.some((q) => q.id === value)
  return (
    <Field label="What kind?">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Chord quality"
          size="sm"
          value={isMore ? '' : value}
          onChange={onChange}
          options={COMMON_QUALITIES.map((q) => ({ value: q.id, label: q.name }))}
        />
        <Select
          label="More chord qualities"
          value={isMore ? value : 'more'}
          onChange={(v) => v !== 'more' && onChange(v)}
          className={cn('h-8 min-w-32 text-[13px]', isMore && 'border-ink')}
          options={[{ value: 'more', label: 'More…' }, ...MORE_QUALITIES.map((q) => ({ value: q.id, label: q.name }))]}
        />
      </div>
    </Field>
  )
}

export function ScaleSelector({ value, onChange, ids }: { value: string; onChange: (id: string) => void; ids?: string[] }) {
  const list = ids ? SCALES.filter((s) => ids.includes(s.id)) : SCALES
  return (
    <Field label="Which scale?">
      <Select label="Scale" value={value} onChange={onChange} className="min-w-52" options={list.map((s) => ({ value: s.id, label: s.name, group: s.group }))} />
    </Field>
  )
}

export function FretRangeSelector({ value, onChange, label = 'Neck area' }: { value: NeckRegionId; onChange: (v: NeckRegionId) => void; label?: string }) {
  return (
    <Field label={label}>
      <Segmented label={label} size="sm" value={value} onChange={onChange} options={NECK_REGIONS.map((r) => ({ value: r.id, label: r.label }))} />
    </Field>
  )
}

export function StringSetSelector({ value, onChange }: { value: StringSetId; onChange: (v: StringSetId) => void }) {
  return (
    <Field label="Which strings?">
      <Segmented label="String set" size="sm" value={value} onChange={onChange} options={STRING_SETS.map((s) => ({ value: s.id, label: s.label }))} />
    </Field>
  )
}

export function CagedShapeSelector({ value, onChange, allowAll }: { value: CagedShape | 'all'; onChange: (v: CagedShape | 'all') => void; allowAll?: boolean }) {
  const opts: { value: CagedShape | 'all'; label: string }[] = CAGED_ORDER.map((s) => ({ value: s, label: `${s} shape` }))
  return (
    <Field label="CAGED shape">
      <Segmented
        label="CAGED shape"
        size="sm"
        value={value}
        onChange={onChange}
        options={allowAll ? [{ value: 'all', label: 'All five' }, ...opts] : opts}
      />
    </Field>
  )
}

export function ProgressionSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Progression">
      <Select label="Progression" value={value} onChange={onChange} className="min-w-44" options={COMMON_PROGRESSIONS.map((p) => ({ value: p.id, label: p.label }))} />
    </Field>
  )
}

/** Notes / Intervals / Both — a global preference, so it follows you between tools. */
export function DisplayToggle({ className }: { className?: string }) {
  const { labels, set, accidentals } = usePrefs()
  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      <Field label="Show">
        <Segmented<LabelMode>
          label="Label notes with"
          size="sm"
          value={labels}
          onChange={(v) => set('labels', v)}
          options={[
            { value: 'notes', label: 'Notes' },
            { value: 'intervals', label: 'Intervals' },
            { value: 'both', label: 'Both' },
          ]}
        />
      </Field>
      <Field label="Spelling">
        <Segmented
          label="Sharps or flats"
          size="sm"
          value={accidentals}
          onChange={(v) => set('accidentals', v)}
          options={[
            { value: 'auto', label: 'Auto', title: 'Spell notes the way the key does' },
            { value: 'sharp', label: '♯', title: 'Always sharps' },
            { value: 'flat', label: '♭', title: 'Always flats' },
          ]}
        />
      </Field>
    </div>
  )
}

export interface LayerDef<T extends string> {
  id: T
  label: string
  hint?: string
}

export function LayerControls<T extends string>({
  layers,
  active,
  onChange,
  label = 'Layers',
}: {
  layers: LayerDef<T>[]
  active: T[]
  onChange: (v: T[]) => void
  label?: string
}) {
  return (
    <Field label={label}>
      <ChipToggles label={label} values={active} onChange={onChange} options={layers.map((l) => ({ value: l.id, label: l.label, title: l.hint }))} />
    </Field>
  )
}

/** Global display settings: labels, spelling, handedness, root emphasis, theme. */
export function DisplaySettings({ trigger }: { trigger?: ReactNode }) {
  const p = usePrefs()
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" aria-label="Display settings">
            <SlidersHorizontal />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent side="right" className="p-6">
        <DialogTitle className="mb-1 font-semibold text-xl">Display</DialogTitle>
        <p className="mb-6 text-sm text-muted">These follow you across every tool and are saved on this device.</p>
        <div className="flex flex-col gap-6">
          <DisplayToggle />
          <Switch checked={p.rootEmphasis} onChange={(v) => p.set('rootEmphasis', v)} label="Emphasize roots" hint="Larger, outlined root squares" />
          <Switch checked={p.leftHanded} onChange={(v) => p.set('leftHanded', v)} label="Left-handed neck" hint="Mirror the fretboard horizontally" />
          <Field label="Theme">
            <Segmented
              label="Theme"
              size="sm"
              value={p.theme}
              onChange={(v) => p.set('theme', v)}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  )
}
