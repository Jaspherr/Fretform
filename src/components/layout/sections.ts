/**
 * Information architecture. Top level is grouped by what the player is trying
 * to do, not by theory topic:
 *   Explore — look at one thing on the neck (notes, a chord, a scale)
 *   Connect — see how things relate (triads in chords, CAGED, fills between chords)
 *   Learn   — guided path and reference
 */
export interface NavItem {
  to: string
  label: string
  /** One line shown in the mobile menu and home page */
  blurb: string
}

export interface NavGroup {
  id: 'explore' | 'connect' | 'learn'
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'explore',
    label: 'Explore',
    items: [
      { to: '/fretboard', label: 'Fretboard', blurb: 'Any note, any interval, anywhere on the neck.' },
      { to: '/chords', label: 'Chords', blurb: 'Every playable shape — and name the one under your fingers.' },
      { to: '/scales', label: 'Scales', blurb: 'Full neck, boxes, how they join, and modes.' },
    ],
  },
  {
    id: 'connect',
    label: 'Connect',
    items: [
      { to: '/triads', label: 'Triads', blurb: 'The three-note shapes hiding inside the chords you know.' },
      { to: '/caged', label: 'CAGED', blurb: 'Five chord shapes that tile the whole neck.' },
      { to: '/fills', label: 'Fills', blurb: 'Which notes connect one chord to the next.' },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    items: [
      { to: '/learn', label: 'Path', blurb: 'Eight short steps from shapes to the whole neck.' },
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
