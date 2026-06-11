import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { setStorageAdapter } from '@shared'
import { localStorageAdapter } from './adapters/localStorageAdapter'
import App from './App'

setStorageAdapter(localStorageAdapter)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
