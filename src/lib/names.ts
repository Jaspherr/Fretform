import { useCallback } from 'react'
import { type PitchClass, autoRoot, displayNote, pcName, pretty } from '@/theory/notes'
import { usePrefs } from './prefs'

/** Name a lone pitch class (no key context) the way the user prefers. */
export function usePcName() {
  const { accidentals } = usePrefs()
  return useCallback(
    (pc: PitchClass) => pretty(accidentals === 'auto' ? displayNote(autoRoot(pc), 'auto') : pcName(pc, accidentals)),
    [accidentals],
  )
}
