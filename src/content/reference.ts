export type ReferenceDemo =
  | { type: 'chord'; root: number; quality: string }
  | { type: 'scale'; root: number; scale: string }
  | { type: 'notes'; pcs: number[] }
  | { type: 'triad'; root: number; quality: string; strings: '123' | '234' | '345' | '456' }
  | { type: 'caged'; root: number }
  | { type: 'chord-in-scale'; key: number; degree: number }

export type ReferenceTable = 'intervals' | 'chord-formulas' | 'diatonic' | 'scale-formulas' | 'modes' | 'inversions' | 'landmarks'

export interface ReferenceTopic {
  slug: string
  title: string
  summary: string
  what: string
  why: string
  where: string
  how: string
  demo: ReferenceDemo
  table?: ReferenceTable
  related: { to: string; label: string }[]
}

export const REFERENCE_TOPICS: ReferenceTopic[] = [
  {
    slug: 'intervals',
    title: 'Intervals',
    summary: 'The distance between two notes, named by job: 3rds, 5ths, 7ths.',
    what: 'An interval is the distance from one note to another, counted in scale steps and half-steps. One fret is a half-step.',
    why: 'Chord names, scale formulas and “play the 3rd” advice are all intervals. Learn them once and they work in every key.',
    where: 'From a root on the E, A or D string: the 5th is one string up and two frets higher, the major 3rd is one string up and one fret lower, and the octave is two strings up and two frets higher. When the jump lands on or crosses over the B string, add one fret.',
    how: 'Pick a root and find its 3rd and 5th without counting frets. That triangle is the core of every major chord.',
    demo: { type: 'chord', root: 7, quality: 'dom7' },
    table: 'intervals',
    related: [{ to: '/learn/know-the-intervals', label: 'Lesson: Know the intervals' }],
  },
  {
    slug: 'chord-construction',
    title: 'How chords are built',
    summary: 'Stack notes from a scale, skipping one each time.',
    what: 'A chord is three or more notes played together. Most chords are built by stacking every other note of a scale: 1, 3, 5, then 7.',
    why: 'If you know a chord’s formula you can build it anywhere, find it in any shape, and see what changes between, say, G and G7.',
    where: 'Look at any chord shape with interval labels on. Every note will be a 1, 3, 5 or 7 (or an extension like 9).',
    how: 'Change one note to change the chord: lower the 3 to get minor, add the ♭7 to get dominant 7.',
    demo: { type: 'chord', root: 0, quality: 'major' },
    table: 'chord-formulas',
    related: [{ to: '/chords', label: 'Chord Explorer' }],
  },
  {
    slug: 'scale-construction',
    title: 'How scales are built',
    summary: 'A pattern of whole and half steps starting from a root.',
    what: 'A scale is a set of notes defined by the steps between them. The major scale is whole, whole, half, whole, whole, whole, half.',
    why: 'Scale formulas tell you exactly how one scale differs from another. Dorian is just natural minor with one note raised.',
    where: 'On one string, the steps are literal: two frets for a whole step, one fret for a half step.',
    how: 'Play a scale along one string to hear and see the step pattern, then return to the box shape.',
    demo: { type: 'scale', root: 0, scale: 'major' },
    table: 'scale-formulas',
    related: [{ to: '/scales', label: 'Scale Explorer' }],
  },
  {
    slug: 'major-scale',
    title: 'The major scale',
    summary: 'The reference scale every interval is measured from.',
    what: 'Seven notes: 1 2 3 4 5 6 7. In C that’s C D E F G A B — the white keys of a piano.',
    why: 'Chord names, modes and keys are all described relative to the major scale. It’s the ruler.',
    where: 'Five CAGED positions cover the whole neck. Each wraps around one of the five major chord shapes.',
    how: 'Use it over major-key songs, and treat its 1, 3 and 5 as landing notes.',
    demo: { type: 'scale', root: 7, scale: 'major' },
    related: [
      { to: '/scales?root=G&scale=major', label: 'G major on the neck' },
      { to: '/caged', label: 'CAGED Explorer' },
    ],
  },
  {
    slug: 'minor-scale',
    title: 'The minor scale',
    summary: 'Natural minor: the major scale’s darker relative.',
    what: 'Natural minor is 1 2 ♭3 4 5 ♭6 ♭7. A minor uses the same notes as C major, but A is home.',
    why: 'Every major key has a relative minor three frets below it. Same notes, same shapes, different home base.',
    where: 'The relative minor root is the 6th note of the major scale — or three frets down from the major root.',
    how: 'Over a minor-key song, start and finish phrases on the minor root.',
    demo: { type: 'scale', root: 9, scale: 'natural-minor' },
    related: [{ to: '/scales?root=A&scale=natural-minor', label: 'A natural minor on the neck' }],
  },
  {
    slug: 'chord-families',
    title: 'Chord families',
    summary: 'Major, minor, dominant, diminished — and what each one does.',
    what: 'Chords fall into families by their 3rd and 7th: major (3), minor (♭3), dominant (3 + ♭7), diminished (♭3 + ♭5).',
    why: 'Knowing the family tells you which scale fits and what the chord wants to do next.',
    where: 'Compare shapes for C, Cm and C7 in the Chord Explorer — only one or two notes move.',
    how: 'When you see an unfamiliar chord, ask: what’s the 3rd? Is there a 7th? That narrows it down instantly.',
    demo: { type: 'chord', root: 0, quality: 'm7' },
    table: 'chord-formulas',
    related: [{ to: '/chords', label: 'Chord Explorer' }],
  },
  {
    slug: 'diatonic-chords',
    title: 'Diatonic chords',
    summary: 'The seven chords that live inside a key.',
    what: 'Build a triad on each note of the major scale using only notes from that scale. You get: I ii iii IV V vi vii°.',
    why: 'This is why G, C, D and Em show up together so often — they all come from G major.',
    where: 'The whole key covers the whole neck. Each chord is a different subset of the same notes.',
    how: 'Learn the pattern major–minor–minor–major–major–minor–diminished. It’s the same in every major key.',
    demo: { type: 'chord-in-scale', key: 7, degree: 4 },
    table: 'diatonic',
    related: [{ to: '/fills/chord-tones', label: 'See the chord inside the scale' }],
  },
  {
    slug: 'triads',
    title: 'Triads',
    summary: 'Three-note chords: the smallest complete chord.',
    what: 'A triad is root, 3rd and 5th — nothing doubled. Major, minor, diminished and augmented are the four types.',
    why: 'Big chord shapes are triads with doubled notes. Triads are lighter, easier to move, and sit well with other instruments.',
    where: 'On any three neighbouring strings there are three triad shapes per chord, repeating every 12 frets.',
    how: 'Play rhythm with triads on the top three strings to stay out of the bass player’s way.',
    demo: { type: 'triad', root: 0, quality: 'major', strings: '123' },
    related: [{ to: '/triads', label: 'Triad Explorer' }],
  },
  {
    slug: 'inversions',
    title: 'Inversions',
    summary: 'Same three notes, different note on the bottom.',
    what: 'Root position has the root lowest. 1st inversion puts the 3rd lowest, 2nd inversion the 5th.',
    why: 'Inversions let you play the same chord higher or lower without jumping across the neck, and they make smooth bass lines (C/E is C with E in the bass).',
    where: 'On one string set, the three inversions sit side by side going up the neck.',
    how: 'Between two chords, pick the inversion that moves your fingers the least.',
    demo: { type: 'triad', root: 7, quality: 'major', strings: '234' },
    table: 'inversions',
    related: [{ to: '/triads/progressions', label: 'Triads through a progression' }],
  },
  {
    slug: 'caged',
    title: 'CAGED',
    summary: 'Five open-chord forms that map the whole neck.',
    what: 'The open chords C, A, G, E and D can each be moved up the neck. For any key, the five shapes interlock in that order.',
    why: 'It turns the neck into five overlapping zones. Every scale position and arpeggio belongs to one of them.',
    where: 'The shapes always appear in the order C → A → G → E → D going up, then repeat.',
    how: 'Learn one key’s five positions, then move the whole map to other keys by moving the root.',
    demo: { type: 'caged', root: 0 },
    related: [{ to: '/caged', label: 'CAGED Explorer' }],
  },
  {
    slug: 'pentatonic',
    title: 'Pentatonic scales',
    summary: 'Five notes, five boxes, very hard to get wrong.',
    what: 'Minor pentatonic is 1 ♭3 4 5 ♭7. Major pentatonic is 1 2 3 5 6. They share the same five shapes.',
    why: 'Leaving out the two notes that most often clash makes pentatonics forgiving — great for riffs, licks and bends.',
    where: 'Five boxes cover the neck. Each one sits around a CAGED chord shape.',
    how: 'Learn how box 1 connects to box 2 before learning all five on their own.',
    demo: { type: 'scale', root: 9, scale: 'minor-pentatonic' },
    related: [
      { to: '/scales/connect', label: 'Connect the boxes' },
      { to: '/scales?root=A&scale=minor-pentatonic', label: 'A minor pentatonic' },
    ],
  },
  {
    slug: 'modes',
    title: 'Modes',
    summary: 'Scales built from the major scale, each with its own home note.',
    what: 'Start the major scale from a different note and treat that note as home: that’s a mode. D to D using C major’s notes is D Dorian.',
    why: 'Each mode has one or two notes that give it a distinct flavor. Knowing them tells you what to emphasize.',
    where: 'A mode uses the same shapes as its parent major scale — only the root squares move.',
    how: 'Compare a mode to major or natural minor and lean on the note that changed.',
    demo: { type: 'scale', root: 2, scale: 'dorian' },
    table: 'modes',
    related: [{ to: '/scales/modes', label: 'Modes made visual' }],
  },
  {
    slug: 'chord-tones',
    title: 'Chord tones',
    summary: 'The notes of the chord that’s playing right now.',
    what: 'Chord tones are the 1, 3, 5 (and 7) of the current chord. Everything else in the key is a passing note.',
    why: 'Lines that land on chord tones sound like they belong to the song. It’s the difference between running a scale and playing the changes.',
    where: 'Inside any scale position, the chord tones form the chord shape you already know.',
    how: 'Play the scale, but start and end each phrase on a chord tone of the current chord.',
    demo: { type: 'chord-in-scale', key: 7, degree: 1 },
    related: [
      { to: '/fills/chord-tones', label: 'See the chord inside the scale' },
      { to: '/fills', label: 'Fill Navigator' },
    ],
  },
  {
    slug: 'fretboard-notes',
    title: 'Fretboard notes',
    summary: 'Landmarks, octaves and the 12th-fret repeat.',
    what: 'Every fret is a half step. The natural notes have half steps only between B–C and E–F.',
    why: 'Knowing a few landmarks lets you find any note in a second instead of counting from the nut.',
    where: 'Fret 5 on each string equals the next string open (except G → B at fret 4). Fret 12 is the open string again, an octave up.',
    how: 'Memorize the notes on the low E and A strings first — they are the root strings for most chord shapes.',
    demo: { type: 'notes', pcs: [0, 2, 4, 5, 7, 9, 11] },
    table: 'landmarks',
    related: [{ to: '/fretboard', label: 'Fretboard Explorer' }],
  },
]

export function getTopic(slug: string | undefined) {
  return REFERENCE_TOPICS.find((t) => t.slug === slug)
}
