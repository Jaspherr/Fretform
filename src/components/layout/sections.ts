export interface NavItem {
  to: string
  label: string
  /** Match the path exactly (for "/") */
  end?: boolean
  /** One line shown in the mobile menu and home page */
  blurb: string
}

export interface NavGroup {
  id: 'play' | 'chords' | 'scales' | 'changes' | 'learn'
  label: string
  items: NavItem[]
}

/**
 * Grouped by what the player is working on, not by theory topic. The neck
 * itself (home) is where every journey can start.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'play',
    label: 'Play',
    items: [{ to: '/', label: 'The neck', blurb: 'Pick a chord and follow it: notes, shape, triad, scale, next chord.', end: true }],
  },
  {
    id: 'chords',
    label: 'Chords',
    items: [
      { to: '/chords', label: 'Chords', blurb: 'Every playable shape — and name the one under your fingers.' },
      { to: '/triads', label: 'Triads', blurb: 'The three-note shapes hiding inside the chords you know.' },
    ],
  },
  {
    id: 'scales',
    label: 'Scales',
    items: [
      { to: '/scales', label: 'Scales', blurb: 'Full neck, boxes, how they join, and modes.' },
      { to: '/caged', label: 'CAGED', blurb: 'Five chord shapes that tile the whole neck.' },
    ],
  },
  {
    id: 'changes',
    label: 'Changes',
    items: [{ to: '/fills', label: 'Changes', blurb: 'Which notes connect one chord to the next — and how to solo over them.' }],
  },
  {
    id: 'learn',
    label: 'Learn',
    items: [
      { to: '/learn', label: 'Path', blurb: 'Eight short steps from shapes to the whole neck — each with a challenge.' },
      { to: '/reference', label: 'Reference', blurb: 'Formulas and definitions, kept short.' },
    ],
  },
]

export const NAV = NAV_GROUPS.flatMap((g) => g.items)

export const CHORD_NAV = [
  { to: '/chords', label: 'Shapes', end: true },
  { to: '/chords/elsewhere', label: 'Play it somewhere else' },
  { to: '/chords/identify', label: 'Name a shape' },
]
export const TRIAD_NAV = [
  { to: '/triads', label: 'Triads on the neck', end: true },
  { to: '/triads/progressions', label: 'Through a progression' },
]
export const SCALE_NAV = [
  { to: '/scales', label: 'Scales', end: true },
  { to: '/scales/connect', label: 'Connect the boxes' },
  { to: '/scales/modes', label: 'Modes' },
]
export const FILL_NAV = [
  { to: '/fills', label: 'Between two chords', end: true },
  { to: '/fills/chord-tones', label: 'Chord tones in a key' },
  { to: '/fills/rhythm-to-lead', label: 'Rhythm → lead' },
]
