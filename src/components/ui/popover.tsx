import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Info } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export function PopoverContent({ className, ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={6}
        collisionPadding={12}
        className={cn('fade-in z-50 w-72 rounded-xl border border-line bg-surface p-4 text-sm text-ink shadow-xl', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

/** Click/tap/keyboard-accessible explanation — not hover-only. */
export function InfoTip({ children, label = 'More info' }: { children: ReactNode; label?: string }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full align-middle text-muted hover:text-ink"
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="text-[13px] leading-relaxed text-ink-soft">{children}</PopoverContent>
    </Popover>
  )
}
