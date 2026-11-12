import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  children,
  side = 'center',
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { side?: 'center' | 'bottom' | 'right' }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fade-in fixed inset-0 z-50 bg-black/40" />
      <DialogPrimitive.Content
        className={cn(
          'fade-in fixed z-50 border border-line bg-surface text-ink shadow-2xl outline-none',
          side === 'center' && 'left-1/2 top-[10vh] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 rounded-2xl',
          side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]',
          side === 'right' && 'inset-y-0 right-0 w-[min(340px,100vw)] overflow-y-auto',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute right-3 top-3 cursor-pointer rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
