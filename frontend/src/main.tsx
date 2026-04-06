import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import './index.css'

// Initialize dark mode from localStorage BEFORE rendering
// This prevents flash of incorrect theme
function initializeTheme() {
  const savedTheme = localStorage.getItem('firewall-theme-mode')
  let isDark = false

  if (savedTheme !== null) {
    // If user previously chose a theme, use it
    isDark = savedTheme === 'dark'
  } else {
    // Otherwise use system preference
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    // Save the preference for next time
    localStorage.setItem('firewall-theme-mode', isDark ? 'dark' : 'light')
  }

  const htmlElement = document.documentElement
  if (isDark) {
    htmlElement.classList.add('dark')
  } else {
    htmlElement.classList.remove('dark')
  }
}

initializeTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            border: '1px solid #374151',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)