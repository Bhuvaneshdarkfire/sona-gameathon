// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'// Optional: Keep this only if you have global styles
import App from './App.tsx' // Update extension to .tsx

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)