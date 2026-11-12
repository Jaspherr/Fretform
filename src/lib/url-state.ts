import { useCallback } from 'react'
import { type SetURLSearchParams, useSearchParams } from 'react-router'
import { type PitchClass, parseRootPc, rootSlug } from '@/theory/notes'
import { usePrefs } from './prefs'

/**
 * Writes made in the same tick are batched into one navigation. React Router
 * computes each functional update from the location at call time, so two
 * back-to-back setters (e.g. shape + fret) would otherwise overwrite each other.
 */
let pending: Map<string, string | null> | null = null

function queueParam(setParams: SetURLSearchParams, name: string, value: string | null) {
  if (!pending) {
    pending = new Map()
    queueMicrotask(() => {
      const updates = pending!
      pending = null
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of updates) {
            if (v === null) next.delete(k)
            else next.set(k, v)
          }
          return next
        },
        { replace: true, preventScrollReset: true },
      )
    })
  }
  pending.set(name, value)
}

/**
 * A piece of tool state that lives in the URL (?root=G&quality=minor) so any
 * diagram can be bookmarked or shared. Invalid values fall back to the default.
 */
export function useUrlParam<T extends string>(
  name: string,
  fallback: T,
  isValid: (v: string) => v is T,
): [T, (v: T) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get(name)
  const value = raw !== null && isValid(raw) ? raw : fallback
  const setValue = useCallback(
    (v: T) => queueParam(setParams, name, v === fallback ? null : v),
    [name, fallback, setParams],
  )
  return [value, setValue]
}

export const oneOf =
  <T extends string>(values: readonly T[]) =>
  (v: string): v is T =>
    (values as readonly string[]).includes(v)

/**
 * Root/key param. Falls back to the last root the user picked anywhere in the
 * app, then to `fallback`. Picking a root remembers it.
 */
export function useRootParam(name = 'root', fallback: PitchClass = 0, remember = true): [PitchClass, (pc: PitchClass) => void] {
  const [params, setParams] = useSearchParams()
  const { lastRoot, set } = usePrefs()
  const fromUrl = parseRootPc(params.get(name))
  const remembered = remember ? parseRootPc(lastRoot) : null
  const value = fromUrl ?? remembered ?? fallback
  const setValue = useCallback(
    (pc: PitchClass) => {
      if (remember) set('lastRoot', rootSlug(pc))
      queueParam(setParams, name, rootSlug(pc))
    },
    [name, remember, set, setParams],
  )
  return [value, setValue]
}
