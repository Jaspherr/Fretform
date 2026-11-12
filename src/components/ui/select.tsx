import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption<T extends string> {
  value: T
  label: ReactNode
  group?: string
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: SelectOption<T>[]
  label: string
  className?: string
}) {
  const groups = [...new Set(options.map((o) => o.group ?? ''))]
  return (
    <SelectPrimitive.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectPrimitive.Trigger
        aria-label={label}
        className={cn(
          'inline-flex h-9 min-w-36 cursor-pointer items-center justify-between gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2',
          className,
        )}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 text-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-[min(70vh,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-lg border border-line bg-surface shadow-lg"
        >
          <SelectPrimitive.Viewport className="p-1">
            {groups.map((g) => (
              <SelectPrimitive.Group key={g}>
                {g && <SelectPrimitive.Label className="px-2 pb-1 pt-2 text-[12.5px] font-semibold text-muted">{g}</SelectPrimitive.Label>}
                {options
                  .filter((o) => (o.group ?? '') === g)
                  .map((o) => (
                    <SelectPrimitive.Item
                      key={o.value}
                      value={o.value}
                      className="relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-7 pr-3 text-sm text-ink outline-none data-[highlighted]:bg-surface-2"
                    >
                      <SelectPrimitive.ItemIndicator className="absolute left-2">
                        <Check className="size-3.5" />
                      </SelectPrimitive.ItemIndicator>
                      <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                  ))}
              </SelectPrimitive.Group>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
