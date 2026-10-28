import { useEffect, useState } from 'react'

// App routes are written as '/', '/login', ... and mapped onto the deploy base (e.g. /vote-together/).
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
const listeners = new Set()

export const toUrl = (to) => `${BASE}${to}`

const currentPath = () => {
  const p = location.pathname
  const stripped = p.startsWith(BASE) ? p.slice(BASE.length) : p
  return stripped.replace(/\/$/, '') || '/'
}

export function navigate(to, { replace = false } = {}) {
  if (toUrl(to) === location.pathname + location.search) return
  history[replace ? 'replaceState' : 'pushState']({}, '', toUrl(to))
  listeners.forEach((fn) => fn())
}

export function usePath() {
  const [path, setPath] = useState(currentPath)
  useEffect(() => {
    const update = () => setPath(currentPath())
    listeners.add(update)
    addEventListener('popstate', update)
    return () => {
      listeners.delete(update)
      removeEventListener('popstate', update)
    }
  }, [])
  return path
}

export function linkProps(to) {
  return {
    href: toUrl(to),
    onClick: (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      navigate(to)
    },
  }
}
