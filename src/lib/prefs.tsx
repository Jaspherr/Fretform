import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BRAND } from '@/brand'
import type { AccidentalPref } from '@/theory/notes'
import { storage } from './utils'

export type LabelMode = 'notes' | 'intervals' | 'both'
export type Theme = 'system' | 'light' | 'dark'

export interface Prefs {
  labels: LabelMode
  accidentals: AccidentalPref
  leftHanded: boolean
  /** Make roots larger and outlined. */
  rootEmphasis: boolean
  theme: Theme
  /** Last key/root the user picked anywhere — new tools open on it. */
  lastRoot: string | null
  dismissedTips: string[]
}

const DEFAULTS: Prefs = {
  labels: 'notes',
  accidentals: 'auto',
  leftHanded: false,
  rootEmphasis: true,
  theme: 'system',
  lastRoot: null,
  dismissedTips: [],
}

const KEY = `${BRAND.storagePrefix}:prefs`

const pick = <T,>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback)

/** Stored prefs are untrusted (old versions, other tabs, hand edits): keep only well-formed values. */
export function sanitize(raw: unknown): Prefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    labels: pick(r.labels, ['notes', 'intervals', 'both'] as const, DEFAULTS.labels),
    accidentals: pick(r.accidentals, ['auto', 'sharp', 'flat'] as const, DEFAULTS.accidentals),
    leftHanded: typeof r.leftHanded === 'boolean' ? r.leftHanded : DEFAULTS.leftHanded,
    rootEmphasis: typeof r.rootEmphasis === 'boolean' ? r.rootEmphasis : DEFAULTS.rootEmphasis,
    theme: pick(r.theme, ['system', 'light', 'dark'] as const, DEFAULTS.theme),
    lastRoot: typeof r.lastRoot === 'string' && r.lastRoot.length <= 3 ? r.lastRoot : null,
    dismissedTips: Array.isArray(r.dismissedTips) ? r.dismissedTips.filter((t): t is string => typeof t === 'string').slice(0, 100) : [],
  }
}

interface PrefsContextValue extends Prefs {
  set: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
  dismissTip: (id: string) => void
}

const PrefsContext = createContext<PrefsContextValue | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(() => sanitize(storage.get<unknown>(KEY, {})))

  useEffect(() => storage.set(KEY, prefs), [prefs])

  // Another tab changed prefs: adopt them instead of overwriting them on our next save.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || e.newValue === null) return
      try {
        const next = sanitize(JSON.parse(e.newValue))
        setPrefs((p) => (JSON.stringify(p) === JSON.stringify(next) ? p : next))
      } catch {
        /* ignore malformed values */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [prefs.theme])

  const set = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => (p[key] === value ? p : { ...p, [key]: value }))
  }, [])

  const dismissTip = useCallback((id: string) => {
    setPrefs((p) => (p.dismissedTips.includes(id) ? p : { ...p, dismissedTips: [...p.dismissedTips, id] }))
  }, [])

  const value = useMemo(() => ({ ...prefs, set, dismissTip }), [prefs, set, dismissTip])
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider')
  return ctx
}
