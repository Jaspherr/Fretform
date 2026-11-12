import { buildScale } from './scales'
import { type AccidentalPref, type PitchClass, displayNote, mod12 } from './notes'
import { getQuality } from './chords'

export interface DiatonicChord {
  /** 1–7 */
  degree: number
  roman: string
  rootPc: PitchClass
  /** ASCII root name spelled in the key */
  rootName: string
  qualityId: 'major' | 'minor' | 'dim'
  symbol: string
  function: string
}

const MAJOR_KEY_QUALITIES: DiatonicChord['qualityId'][] = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim']
const ROMANS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
const FUNCTIONS = [
  'Home. Everything resolves here.',
  'Pre-dominant — often leads to V.',
  'A softer substitute for I or V.',
  'Moves away from home; very common after I.',
  'Strongest pull back to I.',
  'The relative minor — I with a sadder color.',
  'Tense, wants to resolve to I.',
]

/** The seven triads of a major key, spelled within the key. */
export function diatonicChords(keyPc: PitchClass, pref: AccidentalPref = 'auto'): DiatonicChord[] {
  const scale = buildScale(keyPc, 'major', pref)
  return scale.tones.map((t, i) => {
    const qualityId = MAJOR_KEY_QUALITIES[i]
    const rootName = displayNote(t.spelled, pref)
    return {
      degree: i + 1,
      roman: ROMANS[i],
      rootPc: t.pc,
      rootName,
      qualityId,
      symbol: rootName + getQuality(qualityId)!.symbol,
      function: FUNCTIONS[i],
    }
  })
}

export interface Progression {
  id: string
  label: string
  degrees: number[]
  note: string
}

export const COMMON_PROGRESSIONS: Progression[] = [
  { id: 'I-IV-V', label: 'I – IV – V', degrees: [1, 4, 5], note: 'The backbone of rock, blues and country.' },
  { id: 'I-V-vi-IV', label: 'I – V – vi – IV', degrees: [1, 5, 6, 4], note: 'The pop progression behind countless hits.' },
  { id: 'ii-V-I', label: 'ii – V – I', degrees: [2, 5, 1], note: 'The strongest way to land on I — a jazz staple.' },
  { id: 'vi-IV-I-V', label: 'vi – IV – I – V', degrees: [6, 4, 1, 5], note: 'The same four chords as the pop progression, starting on the minor.' },
  { id: 'I-vi-IV-V', label: 'I – vi – IV – V', degrees: [1, 6, 4, 5], note: 'The 50s / doo-wop progression.' },
]

export function getProgression(id: string | null | undefined): Progression | undefined {
  return COMMON_PROGRESSIONS.find((p) => p.id === id)
}

/** Scale degree label of a pitch class within a major key, e.g. "3" or "b7". */
export function degreeInKey(keyPc: PitchClass, pc: PitchClass): string {
  return ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'][mod12(pc - keyPc)]
}
