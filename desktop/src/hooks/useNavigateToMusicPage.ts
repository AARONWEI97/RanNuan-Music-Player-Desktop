import { createContext, useContext } from 'react'

export const MusicPageNavigationContext = createContext<((path: string) => void) | null>(null)

export function useNavigateToMusicPage() {
  const navigate = useContext(MusicPageNavigationContext)
  if (!navigate) throw new Error('Music page links require AppRouter')
  return navigate
}
