import { useNavigate } from 'react-router-dom'

export function useBackNavigation() {
  const navigate = useNavigate()
  return () => {
    // BrowserRouter records the index within this app's history. Total browser history
    // also includes unrelated pages and cannot tell whether in-app Back is available.
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/', { replace: true })
  }
}
