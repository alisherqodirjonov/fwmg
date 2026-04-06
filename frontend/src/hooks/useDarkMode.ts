import { useState, useEffect } from 'react'

export function useDarkMode() {
  // Initialize from DOM (which was set by main.tsx before React renders)
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    // Update DOM and localStorage whenever state changes
    const htmlElement = document.documentElement
    if (isDark) {
      htmlElement.classList.add('dark')
      localStorage.setItem('firewall-theme-mode', 'dark')
    } else {
      htmlElement.classList.remove('dark')
      localStorage.setItem('firewall-theme-mode', 'light')
    }
  }, [isDark])

  return { isDark, setIsDark, toggleDarkMode: () => setIsDark(!isDark) }
}
