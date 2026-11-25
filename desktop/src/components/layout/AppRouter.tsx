import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { MusicPageNavigationContext } from '@/hooks/useNavigateToMusicPage'

function MusicPageNavigationProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const latestNavigate = useRef(navigate)
  useLayoutEffect(() => { latestNavigate.current = navigate }, [navigate])
  // Song rows and metadata links open absolute paths. Giving them a stable callback
  // keeps every mounted row from re-rendering each time the route changes.
  const [open] = useState(() => (path: string) => latestNavigate.current(path))
  return <MusicPageNavigationContext.Provider value={open}>{children}</MusicPageNavigationContext.Provider>
}

export default function AppRouter({ children }: { children: ReactNode }) {
  // Commit the selected page and its loading state as part of the click.
  return (
    <BrowserRouter useTransitions={false}>
      <MusicPageNavigationProvider>{children}</MusicPageNavigationProvider>
    </BrowserRouter>
  )
}
