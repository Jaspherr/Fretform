import { describe, expect, it } from 'vitest'
import { buildChord, CHORD_QUALITIES, chordSymbol, getQuality } from './chords'
import { cagedAcrossNeck, cagedPositions, neighbors } from './caged'
import { diatonicChords } from './diatonic'
import { classifyFillNotes, exampleFills } from './fills'
import { pcAt, STRINGS_LOW_TO_HIGH } from './fretboard'
import { identifyChord, identifyFrets, parseFretString } from './identify'
import { parseInterval } from './intervals'
import { MODES, parentMajorRoot } from './modes'
import { displayNote, mod12, parseRootPc, pcName, type PitchClass } from './notes'
import { connectPatterns, nearestPlacement, pentatonicBoxes, threeNpsPatterns } from './patterns'
import { buildScale, parentMajorSpelling, SCALES } from './scales'
import { toneNames } from './tones'
import { connectProgression, nearestTriad, triadInversion, triadQualityOf, triadsInsideVoicing, triadsOnStringSet, voiceMoves } from './triads'
import { CHALLENGE_KINDS, checkTap, makeChallenge, seededRng } from './challenges'
import { generateVoicings, VOICING_TEMPLATES, placeTemplate, voicingPcs } from './voicings'

const pc = (name: string) => parseRootPc(name)!
const names = toneNames
const sharpName = (s: Parameters<typeof pcAt>[0], f: number) => pcName(pcAt(s, f), 'sharp')

describe('fretboard', () => {
  it('computes notes from open string + fret', () => {
    expect(sharpName(6, 0)).toBe('E')
    expect(sharpName(6, 12)).toBe('E')
    expect(sharpName(5, 3)).toBe('C')
    expect(sharpName(2, 1)).toBe('C')
    expect(sharpName(1, 0)).toBe('E')
    expect(sharpName(3, 0)).toBe('G')
    expect(sharpName(4, 5)).toBe('G')
    expect(sharpName(6, 5)).toBe('A')
    expect(sharpName(2, 3)).toBe('D')
  })
  it('repeats every 12 frets', () => {
    for (const s of STRINGS_LOW_TO_HIGH) for (let f = 0; f <= 10; f++) expect(pcAt(s, f)).toBe(pcAt(s, f + 12))
  })
})

describe('intervals', () => {
  it('parses labels', () => {
    expect(parseInterval('b3').semitones).toBe(3)
    expect(parseInterval('#4').semitones).toBe(6)
    expect(parseInterval('b5').semitones).toBe(6)
    expect(parseInterval('bb7').semitones).toBe(9)
    expect(parseInterval('9').semitones).toBe(2)
    expect(parseInterval('13').semitones).toBe(9)
  })
})

describe('chords', () => {
  it('builds basic chords', () => {
    expect(names(buildChord(pc('C'), 'major').tones)).toEqual(['C', 'E', 'G'])
    expect(names(buildChord(pc('A'), 'minor').tones)).toEqual(['A', 'C', 'E'])
    expect(names(buildChord(pc('G'), 'dom7').tones)).toEqual(['G', 'B', 'D', 'F'])
    expect(names(buildChord(pc('C'), 'maj7').tones)).toEqual(['C', 'E', 'G', 'B'])
    expect(names(buildChord(pc('D'), 'm7').tones)).toEqual(['D', 'F', 'A', 'C'])
    expect(names(buildChord(pc('B'), 'dim').tones)).toEqual(['B', 'D', 'F'])
    expect(names(buildChord(pc('B'), 'm7b5').tones)).toEqual(['B', 'D', 'F', 'A'])
    expect(names(buildChord(pc('C'), 'aug').tones)).toEqual(['C', 'E', 'G#'])
    expect(buildChord(pc('C'), 'dim7').tones.map((t) => t.spelled)).toEqual([
      { letter: 'C', acc: 0 }, { letter: 'E', acc: -1 }, { letter: 'G', acc: -1 }, { letter: 'B', acc: -2 },
    ])
  })
  it('spells with the right letters in flat and sharp keys', () => {
    expect(names(buildChord(pc('Bb'), 'major').tones)).toEqual(['Bb', 'D', 'F'])
    expect(names(buildChord(pc('F#'), 'major').tones)).toEqual(['F#', 'A#', 'C#'])
    expect(names(buildChord(pc('Eb'), 'minor').tones)).toEqual(['Eb', 'Gb', 'Bb'])
    expect(names(buildChord(pc('C#'), 'minor').tones)).toEqual(['C#', 'E', 'G#'])
    expect(chordSymbol(pc('C#'), getQuality('minor')!)).toBe('C#m')
    expect(chordSymbol(pc('Db'), getQuality('major')!)).toBe('Db')
  })
  it('avoids double accidentals in auto display', () => {
    const dim7 = buildChord(pc('C'), 'dim7').tones
    expect(displayNote(dim7[3].spelled, 'auto')).toBe('A')
  })
})

describe('scales', () => {
  it('builds scales from formulas', () => {
    expect(names(buildScale(pc('C'), 'major').tones)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    expect(names(buildScale(pc('A'), 'natural-minor').tones)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    expect(names(buildScale(pc('A'), 'minor-pentatonic').tones)).toEqual(['A', 'C', 'D', 'E', 'G'])
    expect(names(buildScale(pc('C'), 'major-pentatonic').tones)).toEqual(['C', 'D', 'E', 'G', 'A'])
    expect(names(buildScale(pc('A'), 'blues').tones)).toEqual(['A', 'C', 'D', 'Eb', 'E', 'G'])
    expect(names(buildScale(pc('A'), 'harmonic-minor').tones)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G#'])
    expect(names(buildScale(pc('F#'), 'major').tones)).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'])
    expect(names(buildScale(pc('Bb'), 'major').tones)).toEqual(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'])
  })
  it('every scale formula has unique pitch classes', () => {
    for (const s of SCALES) {
      const pcs = buildScale(0, s.id).tones.map((t) => t.pc)
      expect(new Set(pcs).size, s.id).toBe(pcs.length)
    }
  })
})

describe('modes', () => {
  it('derives modes from the parent major scale', () => {
    expect(names(buildScale(pc('D'), 'dorian').tones)).toEqual(['D', 'E', 'F', 'G', 'A', 'B', 'C'])
    expect(names(buildScale(pc('G'), 'mixolydian').tones)).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F'])
    expect(names(buildScale(pc('E'), 'phrygian').tones)).toEqual(['E', 'F', 'G', 'A', 'B', 'C', 'D'])
    expect(names(buildScale(pc('F'), 'lydian').tones)).toEqual(['F', 'G', 'A', 'B', 'C', 'D', 'E'])
    expect(names(buildScale(pc('B'), 'locrian').tones)).toEqual(['B', 'C', 'D', 'E', 'F', 'G', 'A'])
  })
  it('every mode has the same notes as its parent major scale', () => {
    for (const m of MODES) {
      for (let r = 0; r < 12; r++) {
        const parent = parentMajorRoot(r, m)
        const a = new Set(buildScale(r, m.scaleId).tones.map((t) => t.pc))
        const b = new Set(buildScale(parent, 'major').tones.map((t) => t.pc))
        expect([...a].sort()).toEqual([...b].sort())
      }
    }
    expect(parentMajorRoot(pc('D'), MODES[1])).toBe(pc('C'))
  })
  it('spells a mode from its parent key, so every letter appears once with no double flats', () => {
    // Regression: pitch class 3 Locrian was "Eb Locrian" (parent Fb major) with Bbb and Cb.
    expect(names(buildScale(3, 'locrian').tones)).toEqual(['D#', 'E', 'F#', 'G#', 'A', 'B', 'C#'])
    expect(names(buildScale(3, 'phrygian').tones)).toEqual(['D#', 'E', 'F#', 'G#', 'A#', 'B', 'C#'])
    expect(names(buildScale(10, 'locrian').tones)).toEqual(['A#', 'B', 'C#', 'D#', 'E', 'F#', 'G#'])
    // Gb Lydian (parent Db, five flats) rather than F# Lydian (parent C#, seven sharps).
    expect(names(buildScale(6, 'lydian').tones)).toEqual(['Gb', 'Ab', 'Bb', 'C', 'Db', 'Eb', 'F'])
    // F Locrian, never E# Locrian.
    expect(names(buildScale(5, 'locrian').tones)[0]).toBe('F')
    // Ties keep the usual key spelling.
    expect(names(buildScale(3, 'aeolian').tones)[0]).toBe('Eb')
    expect(names(buildScale(10, 'dorian').tones)[0]).toBe('Bb')
    for (const m of MODES)
      for (let r = 0; r < 12; r++) {
        const tones = buildScale(r, m.scaleId).tones
        expect(new Set(tones.map((t) => t.spelled.letter)).size, `${m.name} on ${r}`).toBe(7)
        expect(tones.every((t) => Math.abs(t.spelled.acc) <= 1), `${m.name} on ${r}`).toBe(true)
      }
  })
  it('names the parent key with the same letters as the mode', () => {
    for (const m of MODES)
      for (let r = 0; r < 12; r++) {
        const root = buildScale(r, m.scaleId).tones[0].spelled
        const parent = buildScale(parentMajorRoot(r, m), 'major', 'auto', parentMajorSpelling(root, m)).tones
        // The mode root is the parent's Nth note, spelled identically.
        expect(parent[m.degree - 1].spelled, `${m.name} on ${r}`).toEqual(root)
      }
    expect(displayNote(parentMajorSpelling(buildScale(3, 'locrian').tones[0].spelled, MODES[6]), 'auto')).toBe('E')
  })
  it('keeps the user’s sharp/flat preference for mode roots', () => {
    expect(names(buildScale(3, 'locrian', 'flat').tones, 'flat')[0]).toBe('Eb')
  })
})

describe('triads', () => {
  it('names inversions', () => {
    const c = buildChord(pc('C'), 'major').tones
    expect(names(triadInversion(c, 'root'))).toEqual(['C', 'E', 'G'])
    expect(names(triadInversion(c, 'first'))).toEqual(['E', 'G', 'C'])
    expect(names(triadInversion(c, 'second'))).toEqual(['G', 'C', 'E'])
  })
  it('finds all three inversions on every string set, repeating at the octave', () => {
    for (const set of ['123', '234', '345', '456'] as const) {
      const t = triadsOnStringSet(pc('C'), 'major', set)
      const invs = new Set(t.map((v) => v.inversion))
      expect(invs.size, set).toBe(3)
      for (const v of t) {
        const pcs = v.strings.map((s, i) => pcAt(s, v.frets[i]))
        expect(new Set(pcs)).toEqual(new Set([0, 4, 7]))
        expect(v.maxFret - v.minFret).toBeLessThanOrEqual(4)
      }
    }
  })
  it('known G major triad on strings 1–2–3 at fret 3/3/4 is 1st inversion', () => {
    const t = triadsOnStringSet(pc('G'), 'major', '123').find((v) => v.frets.join() === '4,3,3')
    expect(t?.inversion).toBe('first')
  })
  it('finds triads inside an E-shape barre chord', () => {
    const g = generateVoicings(pc('G'), 'major').find((v) => v.template.id === 'maj-E' && v.rootFret === 3)!
    expect(g.frets).toEqual([3, 5, 5, 4, 3, 3])
    const inside = triadsInsideVoicing(g.frets, pc('G'), 'major')
    expect(inside.map((t) => t.stringSetId).sort()).toEqual(['123', '234', '345'])
  })
  it('connects a progression with small moves', () => {
    const steps = connectProgression(
      [{ rootPc: pc('G'), qualityId: 'major' }, { rootPc: pc('C'), qualityId: 'major' }, { rootPc: pc('D'), qualityId: 'major' }],
      '123',
      3,
    )
    for (let i = 1; i < steps.length; i++) {
      const move = steps[i].triad.frets.reduce((s, f, j) => s + Math.abs(f - steps[i - 1].triad.frets[j]), 0)
      expect(move).toBeLessThanOrEqual(6)
    }
  })
})

describe('voicing templates', () => {
  it('every template produces only chord tones and every required tone, at every root', () => {
    for (const t of VOICING_TEMPLATES) {
      const q = CHORD_QUALITIES.find((c) => c.id === t.qualityId)!
      for (let root = 0; root < 12; root++) {
        for (const v of generateVoicings(root, t.qualityId).filter((v) => v.template === t)) {
          const chordPcs = buildChord(root, q.id).tones
          const allowed = new Set(chordPcs.map((x) => x.pc))
          const played = new Set(voicingPcs(v.frets))
          for (const p of played) expect(allowed.has(p), `${t.id} root ${root}: extra note`).toBe(true)
          for (const tone of chordPcs) {
            if (q.optional?.includes(tone.interval)) continue
            expect(played.has(tone.pc), `${t.id} root ${root}: missing ${tone.interval}`).toBe(true)
          }
          // Lowest sounding note of a root-position template is the root.
          const rootIdx = 6 - t.rootString
          expect(pcAt(t.rootString, v.frets[rootIdx]!)).toBe(root)
          expect(v.maxFret - v.minFret).toBeLessThanOrEqual(4)
        }
      }
    }
  })
  it('places the familiar open chords', () => {
    const open = (root: string, q: string, id: string) =>
      generateVoicings(pc(root), q).find((v) => v.template.id === id && v.minFret === 0)?.frets
    expect(open('C', 'major', 'maj-C')).toEqual([null, 3, 2, 0, 1, 0])
    expect(open('G', 'major', 'maj-G')).toEqual([3, 2, 0, 0, 0, 3])
    expect(open('D', 'major', 'maj-D')).toEqual([null, null, 0, 2, 3, 2])
    expect(open('A', 'minor', 'min-A')).toEqual([null, 0, 2, 2, 1, 0])
    expect(open('E', 'major', 'maj-E')).toEqual([0, 2, 2, 1, 0, 0])
  })
  it('derives open-position fingering from the barre fingering', () => {
    const c = placeTemplate(VOICING_TEMPLATES.find((t) => t.id === 'maj-C')!, 3)!
    expect(c.fingers).toEqual([null, 3, 2, null, 1, null])
  })
})

describe('CAGED', () => {
  it('orders shapes C-A-G-E-D up the neck for C major', () => {
    expect(cagedPositions(pc('C')).map((p) => p.shape)).toEqual(['C', 'A', 'G', 'E', 'D'])
  })
  it('starts with the E shape at fret 3 for G major', () => {
    const g = cagedPositions(pc('G'))
    expect(g.map((p) => p.shape)).toEqual(['G', 'E', 'D', 'C', 'A'])
    expect(g.find((p) => p.shape === 'E')!.voicing.frets).toEqual([3, 5, 5, 4, 3, 3])
  })
  it('knows neighbours', () => {
    expect(neighbors('E')).toEqual({ prev: 'G', next: 'D' })
    expect(neighbors('C')).toEqual({ prev: 'D', next: 'A' })
  })
})

describe('scale patterns', () => {
  const semis = (id: string, root: PitchClass) => buildScale(root, id).tones.map((t) => (t.pc - root + 12) % 12)
  it('builds A minor pentatonic box 1 at the 5th fret', () => {
    const boxes = pentatonicBoxes(pc('A'), semis('minor-pentatonic', pc('A')))
    expect(boxes[0].positions.map((p) => p.fret)).toEqual([5, 8, 5, 7, 5, 7, 5, 7, 5, 8, 5, 8])
    expect(boxes[1].positions.map((p) => p.fret)).toEqual([8, 10, 7, 10, 7, 10, 7, 9, 8, 10, 8, 10])
  })
  it('box 1 and box 2 share notes', () => {
    const boxes = pentatonicBoxes(pc('A'), semis('minor-pentatonic', pc('A')))
    const c = connectPatterns(boxes[0], nearestPlacement(boxes[0], boxes[1]))
    expect(c.shared.length).toBe(6)
  })
  it('3NPS patterns hold 18 scale notes', () => {
    const p = threeNpsPatterns(pc('G'), semis('major', pc('G')))
    const scalePcs = new Set(buildScale(pc('G'), 'major').tones.map((t) => t.pc))
    expect(p).toHaveLength(7)
    for (const pat of p) {
      expect(pat.positions).toHaveLength(18)
      for (const q of pat.positions) expect(scalePcs.has(pcAt(q.string, q.fret))).toBe(true)
    }
  })
})

describe('chord identifier', () => {
  const top = (input: string) => {
    const r = parseFretString(input)
    if (!r.ok) throw new Error(r.error)
    return identifyFrets(r.frets).matches[0]
  }
  it('parses compact and spaced input', () => {
    expect(parseFretString('x32010')).toEqual({ ok: true, frets: [null, 3, 2, 0, 1, 0] })
    expect(parseFretString('8 10 10 9 8 8')).toEqual({ ok: true, frets: [8, 10, 10, 9, 8, 8] })
    expect(parseFretString('x3201').ok).toBe(false)
  })
  it('identifies common shapes', () => {
    expect(top('x32010').symbol).toBe('C')
    expect(top('320003').symbol).toBe('G')
    expect(top('x02210').symbol).toBe('Am')
    expect(top('8 10 10 9 8 8').symbol).toBe('C')
    expect(top('320001').symbol).toBe('G7')
    expect(top('x02020').symbol).toBe('A7')
    expect(top('xx0232').symbol).toBe('D')
    expect(top('x2423x').symbol).toBe('Bm7')
    expect(top('x2323x').symbol).toBe('Bm7b5')
  })
  it('names inversions with slash chords', () => {
    const m = top('032010')
    expect(m.symbol).toBe('C/E')
    expect(m.inversion).toBe('1st inversion')
  })
  it('reports intervals for x32010', () => {
    const r = identifyFrets([null, 3, 2, 0, 1, 0])
    const m = r.matches[0]
    expect(r.notes.map((n) => m.tones.find((t) => t.pc === n.pc)!.interval)).toEqual(['1', '3', '5', '1', '3'])
  })
  it('acknowledges ambiguity: C6 and Am7 share notes', () => {
    const m = identifyChord([pc('A'), pc('C'), pc('E'), pc('G')], pc('C'))
    const symbols = m.map((x) => x.symbol)
    expect(symbols[0]).toBe('C6')
    expect(symbols).toContain('Am7/C')
  })
})

describe('chord identifier against the voicing library', () => {
  it('names every template, at every root, as the chord it was built for', () => {
    for (const t of VOICING_TEMPLATES)
      for (let r = 0; r < 12; r++)
        for (const v of generateVoicings(r, t.qualityId).filter((x) => x.template === t)) {
          const top = identifyFrets(v.frets).matches[0]
          expect(top && `${top.rootPc}:${top.quality.id}`, `${t.id} at ${v.frets.join(',')}`).toBe(`${r}:${t.qualityId}`)
        }
  })
})

describe('diatonic chords', () => {
  it('builds the chords of G major', () => {
    expect(diatonicChords(pc('G')).map((c) => c.symbol)).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'])
  })
})

describe('fills', () => {
  const ctx = {
    keyPc: pc('G'),
    current: { rootPc: pc('G'), qualityId: 'major' },
    next: { rootPc: pc('C'), qualityId: 'major' },
    range: { start: 3, end: 7 },
  }
  it('classifies chord, target, common and passing notes', () => {
    const cells = classifyFillNotes(ctx)
    const role = (pcName: string) => new Set(cells.filter((c) => c.pc === pc(pcName)).map((c) => c.role))
    expect(role('G')).toEqual(new Set(['common']))
    expect(role('B')).toEqual(new Set(['safe']))
    expect(role('C')).toEqual(new Set(['target']))
    expect(role('A')).toEqual(new Set(['passing']))
    expect(cells.some((c) => c.pc === pc('C#'))).toBe(false)
  })
  it('generates in-key fills that stay in the window', () => {
    const fills = exampleFills(ctx)
    expect(fills.length).toBeGreaterThanOrEqual(2)
    const key = new Set(buildScale(pc('G'), 'major').tones.map((t) => t.pc))
    for (const f of fills) {
      expect(f.notes.length).toBeGreaterThanOrEqual(2)
      expect(f.notes.length).toBeLessThanOrEqual(5)
      for (const n of f.notes) {
        expect(key.has(n.pc)).toBe(true)
        expect(n.fret).toBeGreaterThanOrEqual(3)
        expect(n.fret).toBeLessThanOrEqual(7)
      }
    }
    const connecting = fills.find((f) => f.kind === 'connecting')!
    const cTones = new Set(buildChord(pc('C'), 'major').tones.map((t) => t.pc))
    expect(cTones.has(connecting.notes[connecting.notes.length - 1].pc)).toBe(true)
  })
})

describe('CAGED across the neck (drives the shape bands)', () => {
  it('tiles G major in C-A-G-E-D order from the nut up', () => {
    const order = cagedAcrossNeck(7, 'major')
      .sort((a, b) => a.voicing.minFret - b.voicing.minFret)
      .map((p) => `${p.shape}${p.voicing.minFret}`)
    expect(order.slice(0, 6)).toEqual(['G0', 'E3', 'D5', 'C7', 'A10', 'G12'])
  })

  it('neighbouring placements overlap or touch — the neck is one map', () => {
    for (const root of [0, 2, 4, 5, 7, 9, 11]) {
      const ps = cagedAcrossNeck(root, 'major').sort((a, b) => a.voicing.minFret - b.voicing.minFret)
      for (let i = 1; i < ps.length; i++) expect(ps[i].voicing.minFret).toBeLessThanOrEqual(ps[i - 1].voicing.maxFret + 1)
    }
  })

  it('the E-shape G barre contains a 1st-inversion G triad on strings 1–2–3 (home hero claim)', () => {
    const e = cagedAcrossNeck(7, 'major').find((p) => p.shape === 'E' && p.voicing.minFret === 3)!
    const t = triadsInsideVoicing(e.voicing.frets, 7, 'major').find((x) => x.stringSetId === '123')!
    expect(t.frets).toEqual([4, 3, 3])
    expect(t.inversion).toBe('first')
  })
})

describe('voice leading for the neck (home)', () => {
  it('reduces chord types to their core triad', () => {
    expect(triadQualityOf('dom7')).toBe('major')
    expect(triadQualityOf('m7')).toBe('minor')
    expect(triadQualityOf('m7b5')).toBe('dim')
    expect(triadQualityOf('sus4')).toBeNull()
  })
  it('G → C on strings 1–2–3 moves the hand as little as possible', () => {
    // G major 1st inversion at frets 4-3-3 (B D G) — inside the E-shape barre at fret 3.
    const g = triadsOnStringSet(pc('G'), 'major', '123').find((t) => t.frets.join() === '4,3,3')!
    const c = nearestTriad(g, pc('C'), 'major')!
    // Nearest C triad: 5-5-3 (C E G): B→C up 1, D→E up 2, G stays.
    expect(c.frets).toEqual([5, 5, 3])
    expect(voiceMoves(g, c).map((m) => m.semitones)).toEqual([1, 2, 0])
    // Whatever the chords, the answer is never further than any other option.
    for (let r = 0; r < 12; r++)
      for (const t of triadsOnStringSet(r, 'major', '234')) {
        const n = nearestTriad(t, mod12(r + 7), 'major')!
        const cost = (x: number[]) => x.reduce((s, f, i) => s + Math.abs(f - t.frets[i]), 0)
        for (const o of triadsOnStringSet(mod12(r + 7), 'major', '234')) expect(cost(n.frets)).toBeLessThanOrEqual(cost(o.frets))
      }
  })
})

describe('challenges', () => {
  it('always have at least one answer, every answer checks out, and wrong taps are explained', () => {
    for (const kind of CHALLENGE_KINDS)
      for (let seed = 1; seed <= 40; seed++) {
        const c = makeChallenge(kind, seededRng(seed))
        expect(c.answers.length, `${kind} #${seed}: ${c.prompt}`).toBeGreaterThan(0)
        for (const a of c.answers) {
          expect(c.correctPcs, `${kind} #${seed}`).toContain(pcAt(a.string, a.fret))
          expect(checkTap(c, a).correct).toBe(true)
        }
        // A tap far outside the answer area is never "correct".
        expect(checkTap(c, { string: 1, fret: 22 }).correct).toBe(false)
      }
  })
  it('explains what a wrong tap actually is', () => {
    const c = makeChallenge('find-interval', seededRng(3))
    const root = c.context.rootPc!
    const wrong = c.given[0]
    const r = checkTap(c, wrong)
    expect(r.correct).toBe(false)
    expect(r.explanation).toMatch(/root of/)
    expect(pcAt(wrong.string, wrong.fret)).toBe(root)
  })
})
