export type LeadLayer = 'chord' | 'triad' | 'roots' | 'pent' | 'scale' | 'fill'

export const LEAD_LAYERS: { id: LeadLayer; label: string; title: string; text: (s: string) => string }[] = [
  { id: 'chord', label: '1 · Full chord', title: 'The chord you already play', text: (s) => `Start with the ${s} barre shape. Every note here is a chord tone — this is your home base.` },
  { id: 'triad', label: '2 · Triad inside', title: 'The triad inside it', text: () => 'Drop the doubled notes and a three-string triad is left. Same chord, smaller and easier to move — perfect for rhythm fills.' },
  { id: 'roots', label: '3 · Roots', title: 'The roots', text: () => 'The squares are the roots. Every lick you play here can start or resolve on one of them.' },
  { id: 'pent', label: '4 · Pentatonic', title: 'The pentatonic around it', text: () => 'Add the pentatonic notes. They sit one or two frets from chord tones — your hand doesn’t move.' },
  { id: 'scale', label: '5 · Full scale', title: 'The full scale', text: () => 'Fill in the remaining scale notes. Now you have every “safe” note in this position.' },
  { id: 'fill', label: '6 · Fill area', title: 'Where fills live', text: () => 'The top three strings around the triad are where short fills sound best during rhythm playing — they don’t clash with the bass.' },
]

export const LEAD_ORDER: LeadLayer[] = ['chord', 'triad', 'roots', 'pent', 'scale', 'fill']
