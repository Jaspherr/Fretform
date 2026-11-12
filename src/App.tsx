import { type ComponentType, lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { PrefsProvider } from '@/lib/prefs'
import { HomePage } from '@/pages/Home'

/** Lazy-load one named page export so each section ships as its own chunk. */
const page = <M, K extends keyof M>(load: () => Promise<M>, name: K) =>
  lazy(async () => ({ default: (await load())[name] as ComponentType }))

const LearnIndex = page(() => import('@/pages/Learn'), 'LearnIndex')
const LessonPage = page(() => import('@/pages/Learn'), 'LessonPage')
const FretboardPage = page(() => import('@/pages/FretboardExplorer'), 'FretboardPage')
const ChordsPage = page(() => import('@/pages/Chords'), 'ChordsPage')
const ElsewherePage = page(() => import('@/pages/Chords'), 'ElsewherePage')
const IdentifyPage = page(() => import('@/pages/ChordIdentifier'), 'IdentifyPage')
const TriadsPage = page(() => import('@/pages/Triads'), 'TriadsPage')
const ProgressionsPage = page(() => import('@/pages/Triads'), 'ProgressionsPage')
const ScalesPage = page(() => import('@/pages/Scales'), 'ScalesPage')
const ConnectPage = page(() => import('@/pages/Scales'), 'ConnectPage')
const ModesPage = page(() => import('@/pages/Modes'), 'ModesPage')
const CagedPage = page(() => import('@/pages/Caged'), 'CagedPage')
const FillsPage = page(() => import('@/pages/Fills'), 'FillsPage')
const ChordTonesPage = page(() => import('@/pages/Fills'), 'ChordTonesPage')
const RhythmToLeadPage = page(() => import('@/pages/RhythmToLead'), 'RhythmToLeadPage')
const ReferenceIndex = page(() => import('@/pages/Reference'), 'ReferenceIndex')
const ReferencePage = page(() => import('@/pages/Reference'), 'ReferencePage')
const NotFound = page(() => import('@/pages/Reference'), 'NotFound')

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/learn', element: <LearnIndex /> },
      { path: '/learn/:slug', element: <LessonPage /> },
      { path: '/fretboard', element: <FretboardPage /> },
      { path: '/chords', element: <ChordsPage /> },
      { path: '/chords/elsewhere', element: <ElsewherePage /> },
      { path: '/chords/identify', element: <IdentifyPage /> },
      { path: '/triads', element: <TriadsPage /> },
      { path: '/triads/progressions', element: <ProgressionsPage /> },
      { path: '/scales', element: <ScalesPage /> },
      { path: '/scales/connect', element: <ConnectPage /> },
      { path: '/scales/modes', element: <ModesPage /> },
      { path: '/caged', element: <CagedPage /> },
      { path: '/fills', element: <FillsPage /> },
      { path: '/fills/chord-tones', element: <ChordTonesPage /> },
      { path: '/fills/rhythm-to-lead', element: <RhythmToLeadPage /> },
      { path: '/reference', element: <ReferenceIndex /> },
      { path: '/reference/:slug', element: <ReferencePage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export function App() {
  return (
    <PrefsProvider>
      <RouterProvider router={router} />
    </PrefsProvider>
  )
}
