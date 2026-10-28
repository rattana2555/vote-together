import { useEffect, useState } from 'react'

const listeners = new Set()

export function navigate(to, { replace = false } = {}) {
  if (to === location.pathname + location.search) return
  history[replace ? 'replaceState' : 'pushState']({}, '', to)
  listeners.forEach((fn) => fn())
}

export function usePath() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const update = () => setPath(location.pathname)
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
    href: to,
    onClick: (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      navigate(to)
    },
  }
}
