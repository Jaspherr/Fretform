/**
 * The "From Shapes to Fretboard" path. Each lesson pairs short copy with one of
 * the real interactive tools (embedded by `tool`).
 */
export type LessonTool =
  | 'notes'
  | 'intervals'
  | 'chords-everywhere'
  | 'triads'
  | 'caged'
  | 'scale-overlay'
  | 'chord-tones'
  | 'fills'
  | 'rhythm-to-lead'

export interface Lesson {
  slug: string
  step: string
  title: string
  summary: string
  tool: LessonTool
  /** Full tool page for going deeper */
  toolLink: { to: string; label: string }
  seeing: string
  matters: string
  find: string
  tryThis: string
}

export const LESSONS: Lesson[] = [
  {
    slug: 'know-the-notes',
    step: '01',
    title: 'Know the notes',
    summary: 'Learn where notes repeat across the neck so no fret is a mystery.',
    tool: 'notes',
    toolLink: { to: '/fretboard', label: 'Open the Fretboard Explorer' },
    seeing: 'Every place one note lives on the neck. Pick a note and it lights up on all six strings.',
    matters: 'Every chord and scale shape is anchored to a root. If you can find the root fast, you can put any shape anywhere.',
    find: 'Look for the octave shapes: two strings up and two frets over, or two strings up and three frets over when you cross the B string.',
    tryThis: 'Pick C. Play every C from the low E string to the high e, saying the string name out loud. Then do the same with G and F.',
  },
  {
    slug: 'know-the-intervals',
    step: '02',
    title: 'Know the intervals',
    summary: 'Roots, thirds, fifths and sevenths — the job each note does.',
    tool: 'intervals',
    toolLink: { to: '/chords', label: 'See intervals inside any chord' },
    seeing: 'A chord labelled by job instead of letter: 1 is the root, 3 makes it major or minor, 5 adds weight, 7 adds color.',
    matters: 'Letters change with every key, but intervals don’t. A major chord is 1–3–5 in every key and every position.',
    find: 'Switch the labels to Intervals. Notice the 3 always sits in the same spot relative to the root square inside a shape.',
    tryThis: 'Play an E-shape barre chord, then lift just the finger on the 3rd (G string). The barre underneath now sounds the ♭3, and the chord turns minor — that one note decides major or minor.',
  },
  {
    slug: 'see-chords-everywhere',
    step: '03',
    title: 'See chords everywhere',
    summary: 'The same chord lives in at least five places on the neck.',
    tool: 'chords-everywhere',
    toolLink: { to: '/chords/elsewhere', label: 'Find any chord somewhere else' },
    seeing: 'One chord — G major — in several positions, from open position to the 12th fret.',
    matters: 'If you only know one grip per chord, you jump around the neck. Knowing nearby versions lets you stay put and still play the changes.',
    find: 'Each version has the same three notes (G, B, D) stacked differently. Follow the root squares and you’ll see the shapes chain together.',
    tryThis: 'Strum G in each position, moving up the neck. Then pick one position and play G, C and D without leaving it.',
  },
  {
    slug: 'learn-triads',
    step: '04',
    title: 'Learn triads',
    summary: 'Shrink big chords into movable three-note shapes.',
    tool: 'triads',
    toolLink: { to: '/triads', label: 'Open the Triad Explorer' },
    seeing: 'Three-note chords on three neighbouring strings, in all three inversions.',
    matters: 'Triads are the small, clear chord shapes that let you comp, fill and move up the neck without big barre grips.',
    find: 'Your triad is already inside the barre chord you know. We’re just removing duplicate notes.',
    tryThis: 'On strings 1–2–3, play the three C major inversions in order up the neck. Then do it without looking at the screen.',
  },
  {
    slug: 'connect-caged',
    step: '05',
    title: 'Connect CAGED',
    summary: 'See how five familiar chord forms overlap into one map of the neck.',
    tool: 'caged',
    toolLink: { to: '/caged', label: 'Open the CAGED Explorer' },
    seeing: 'Five chord shapes — C, A, G, E, D — placed along the neck for one key. Each one shares notes with the next.',
    matters: 'CAGED isn’t five chords to memorize. It’s five neighbourhoods. Once you know which neighbourhood you’re in, you know where everything is.',
    find: 'Where one shape ends, the next begins — they share the root notes at the edges.',
    tryThis: 'Pick a key and play all five shapes in order going up the neck, then back down.',
  },
  {
    slug: 'overlay-scales',
    step: '06',
    title: 'Overlay scales',
    summary: 'See the scale notes that surround each chord shape.',
    tool: 'scale-overlay',
    toolLink: { to: '/caged', label: 'Explore CAGED + scales' },
    seeing: 'A chord shape with its scale drawn around it. Chord tones are bright; the rest of the scale fills the gaps.',
    matters: 'The scale isn’t floating randomly around the neck. The chord exists inside it, so every scale box is really a chord shape plus neighbours.',
    find: 'Toggle Chord only, then Chord + Scale. The extra notes are always one or two frets from a chord tone.',
    tryThis: 'Hold the chord shape, then play the scale notes on each string without moving your hand.',
  },
  {
    slug: 'target-chord-tones',
    step: '07',
    title: 'Target chord tones',
    summary: 'Understand why certain notes sound stronger over each chord.',
    tool: 'chord-tones',
    toolLink: { to: '/fills/chord-tones', label: 'Open Chord Tones' },
    seeing: 'The whole key, with the notes of one chord highlighted and everything else faded.',
    matters: 'Over a chord, its own notes sound settled and the rest sound like movement. Landing on a chord tone is what makes a line sound intentional.',
    find: 'Step through I, IV and V. The scale stays the same — only the highlighted notes move.',
    tryThis: 'Improvise with the scale, but make sure the note you stop on is a highlighted one.',
  },
  {
    slug: 'add-fills',
    step: '08',
    title: 'Add fills',
    summary: 'Use surrounding scale notes to connect rhythm parts.',
    tool: 'fills',
    toolLink: { to: '/fills', label: 'Open the Fill Navigator' },
    seeing: 'The notes around your current chord, sorted into safe notes, passing notes and target notes for the next chord.',
    matters: 'A fill is just a short walk from the chord you’re on to the chord you’re going to. Knowing the landing note is most of the work.',
    find: 'Dashed green rings mark notes from the next chord. Walk toward one and land on it as the chord changes.',
    tryThis: 'Strum G for three beats, then play a three-note fill into C that lands on a green note.',
  },
  {
    slug: 'rhythm-to-lead',
    step: '★',
    title: 'Turn your chord into a lead position',
    summary: 'Your barre chord, its triad, the pentatonic and the full scale — all in one spot.',
    tool: 'rhythm-to-lead',
    toolLink: { to: '/fills/rhythm-to-lead', label: 'Open the full guide' },
    seeing: 'An E-shape barre chord with lead material layered on top, one layer at a time.',
    matters: 'Rhythm and lead aren’t in different places. The chord you’re already holding is the center of your solo position.',
    find: 'Turn on each layer in order and watch how little your hand needs to move.',
    tryThis: 'Strum the chord, then play the triad, then a pentatonic lick in the same spot, then go back to strumming.',
  },
]

export function getLesson(slug: string | undefined) {
  return LESSONS.find((l) => l.slug === slug)
}
