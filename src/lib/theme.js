import { useEffect, useState } from 'react'
import { store } from './storage.js'

const KEY = 'vt-theme'

export function useTheme() {
  const [theme, setTheme] = useState(() => store.get(KEY) || 'system')
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    store.set(KEY, theme === 'system' ? null : theme)
  }, [theme])

  const isDark = () =>
    theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  const toggle = () => setTheme(isDark() ? 'light' : 'dark')
  return { theme, toggle, isDark }
}
