import * as ToggleGroup from '@radix-ui/react-toggle-group'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  title?: string
}

/** Single-choice button row. Arrow keys move between options (Radix roving focus). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: SegmentOption<T>[]
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className={cn('inline-flex flex-wrap rounded-md border border-line bg-surface-2/70 p-0.5', className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          title={o.title}
          className={cn(
            'shrink-0 cursor-pointer rounded-[4px] font-medium text-ink-soft transition-colors hover:text-ink data-[state=on]:bg-surface data-[state=on]:text-ink data-[state=on]:shadow-[0_0_0_1px_var(--ink-soft)]',
            size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-8 px-3 text-[13.5px]',
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}

/** Multi-choice chip row. */
export function ChipToggles<T extends string>({
  values,
  onChange,
  options,
  label,
  className,
}: {
  values: T[]
  onChange: (v: T[]) => void
  options: SegmentOption<T>[]
  label: string
  className?: string
}) {
  return (
    <ToggleGroup.Root
      type="multiple"
      value={values}
      onValueChange={(v) => onChange(v as T[])}
      aria-label={label}
      className={cn('flex flex-wrap gap-1.5', className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          title={o.title}
          className="h-8 min-w-9 cursor-pointer rounded-full border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink data-[state=on]:border-ink data-[state=on]:bg-ink data-[state=on]:text-bg"
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
