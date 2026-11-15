import { Menu, Search as SearchIcon } from 'lucide-react'
import { Fragment, Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import { BRAND } from '@/brand'
import { DisplaySettings } from '@/components/controls'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { NAV_GROUPS } from './sections'
import { SearchDialog } from './SearchDialog'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 rounded-md" aria-label={`${BRAND.name} home`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="5" fill="var(--neck)" stroke="var(--ink)" strokeWidth="1.5" />
        <path d="M12 5v22M21 5v22" stroke="var(--fret-wire)" strokeWidth="1.4" />
        <path d="M5 9h22M5 16h22M5 23h22" stroke="var(--string)" strokeWidth="1" />
        <rect x="12.5" y="12.5" width="7" height="7" rx="1.8" fill="var(--iv-root)" />
      </svg>
      <span className="text-[18px] font-bold tracking-tight text-ink" style={{ fontStretch: '85%' }}>
        {BRAND.name}
      </span>
    </Link>
  )
}

function SkeletonPage() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 pt-8 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-64 animate-pulse rounded bg-surface-2" />
      <div className="mt-6 h-[260px] animate-pulse rounded-lg bg-surface-2/70" />
    </div>
  )
}

export function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      } else if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-bg">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/92 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav aria-label="Main" className="ml-5 hidden items-center lg:flex">
            {NAV_GROUPS.map((g, gi) => (
              <Fragment key={g.id}>
                {gi > 0 && <span aria-hidden="true" className="mx-2 h-4 w-px bg-line-strong" />}
                <ul aria-label={g.label} className="flex items-center">
                  {g.items.map((n) => (
                    <li key={n.to}>
                      <NavLink
                        to={n.to}
                        className={({ isActive }) =>
                          cn(
                            'relative block rounded-md px-2.5 py-1.5 text-[14px] font-medium text-ink-soft transition-colors hover:text-ink',
                            isActive && 'text-ink after:absolute after:inset-x-2.5 after:-bottom-[11px] after:h-[2px] after:bg-ink',
                          )
                        }
                      >
                        {n.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </Fragment>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-[13px] text-muted hover:border-line-strong hover:text-ink"
              aria-label="Search chords, scales…"
              aria-keyshortcuts="Control+K"
            >
              <SearchIcon className="size-4" />
              <span className="hidden xl:inline">Search chords, scales…</span>
              <kbd aria-hidden="true" className="hidden rounded border border-line px-1 text-[11px] xl:inline">Ctrl K</kbd>
            </button>
            <DisplaySettings />
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
              <Menu />
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent side="right" className="p-5">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <div className="mb-5">
            <Logo />
          </div>
          <nav aria-label="Main" className="flex flex-col gap-5">
            {NAV_GROUPS.map((g) => (
              <section key={g.id}>
                <h2 className="mb-1 px-3 text-[12.5px] font-semibold text-muted">{g.label}</h2>
                <ul>
                  {g.items.map((n) => (
                    <li key={n.to}>
                      <NavLink
                        to={n.to}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) => cn('block rounded-md px-3 py-2 hover:bg-surface-2', isActive && 'bg-surface-2')}
                      >
                        <span className="block text-[16px] font-semibold text-ink">{n.label}</span>
                        <span className="block text-[13px] leading-snug text-muted">{n.blurb}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
        </DialogContent>
      </Dialog>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      <main id="main" className="flex-1">
        <Suspense fallback={<SkeletonPage />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-10 text-[13.5px] text-muted sm:grid-cols-[1fr_auto] sm:px-6 lg:px-8">
          <p className="max-w-sm">
            <span className="font-semibold text-ink">{BRAND.name}</span>. {BRAND.tagline} Standard tuning, 22 frets, everything worked out in your browser.
          </p>
          <nav aria-label="Footer" className="grid grid-cols-3 gap-x-10 gap-y-1">
            {NAV_GROUPS.map((g) => (
              <ul key={g.id} aria-label={g.label} className="flex flex-col gap-1">
                <li className="font-semibold text-ink-soft">{g.label}</li>
                {g.items.map((n) => (
                  <li key={n.to}>
                    <Link to={n.to} className="hover:text-ink">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </nav>
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  )
}

/** Second-level tabs for sections that hold several tools (Chords, Scales…). */
export function SubNav({ items }: { items: { to: string; label: string; end?: boolean }[] }) {
  return (
    <nav aria-label="Section" className="scroll-x -mx-4 mb-6 flex gap-1 overflow-y-hidden border-b border-line px-4 sm:mx-0 sm:px-0">
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end={i.end}
          className={({ isActive }) =>
            cn(
              'whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-[14px] font-medium text-muted hover:text-ink',
              isActive && 'border-ink text-ink',
            )
          }
        >
          {i.label}
        </NavLink>
      ))}
    </nav>
  )
}
