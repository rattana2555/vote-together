// Drive images are proxied by the backend (files stay private). Lookups go memory → this device's
// Cache Storage → network; network requests made in the same tick are batched.
import { useEffect, useState } from 'react'
import { api } from './api.js'

const BATCH = 4
const DISK = 'vt-images-v1'
const cache = new Map()
const waiting = new Map()
let queue = []
let timer = 0
let scope = null

// Admin screens show entries of hidden campaigns; the backend only serves those when told which campaign.
export function setImageScope(campaignId) {
  scope = campaignId || null
}

const diskUrl = (key) => `/__vt-img/${encodeURIComponent(key)}`

async function fromDisk(key) {
  try {
    const hit = await (await globalThis.caches.open(DISK)).match(diskUrl(key))
    return hit ? await hit.text() : null
  } catch {
    return null
  }
}

function toDisk(key, src) {
  globalThis.caches
    ?.open(DISK)
    .then((c) => c.put(diskUrl(key), new Response(src)))
    .catch(() => {})
}

function settle(key, src) {
  if (src) cache.set(key, src)
  waiting.get(key)?.forEach((fn) => fn(src))
  waiting.delete(key)
}

function flush() {
  timer = 0
  const jobs = queue
  queue = []
  const bySize = {}
  jobs.forEach((j) => (bySize[j.size] ||= []).push(j.id))
  Object.entries(bySize).forEach(([size, ids]) => {
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH)
      api
        .images(chunk, size, scope)
        .catch(() => ({}))
        .then((images) => {
          chunk.forEach((id) => {
            const key = `${size}:${id}`
            const src = images[id] || null
            if (src) toDisk(key, src)
            settle(key, src)
          })
        })
    }
  })
}

export function loadImage(id, size = 's') {
  const key = `${size}:${id}`
  if (cache.has(key)) return Promise.resolve(cache.get(key))
  return new Promise((resolve) => {
    if (waiting.has(key)) return waiting.get(key).push(resolve)
    waiting.set(key, [resolve])
    fromDisk(key).then((src) => {
      if (src) return settle(key, src)
      queue.push({ id, size })
      timer ||= setTimeout(flush, 40)
    })
  })
}

export const cachedImage = (id, size = 's') => cache.get(`${size}:${id}`) || null

export function useDriveImage(id, size = 's', enabled = true) {
  const [src, setSrc] = useState(() => (id ? cachedImage(id, size) : null))
  useEffect(() => {
    if (!id) return
    setSrc(cachedImage(id, size))
    if (!enabled) return
    let alive = true
    let timer = 0
    // A photo uploaded moments ago may not be ready in Drive yet: try again a few times.
    const attempt = (n) =>
      loadImage(id, size).then((s) => {
        if (!alive) return
        if (s) return setSrc(s)
        if (n < 3) timer = setTimeout(() => attempt(n + 1), 8000 * (n + 1))
      })
    attempt(0)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [id, size, enabled])
  return src
}

// True once the element is within ~1.5 screens of the viewport, so off-screen photos don't queue up first.
export function useNearViewport(ref, eager = false) {
  const [near, setNear] = useState(eager)
  useEffect(() => {
    if (near || !ref.current || typeof IntersectionObserver === 'undefined') {
      if (!near && typeof IntersectionObserver === 'undefined') setNear(true)
      return
    }
    const io = new IntersectionObserver((list) => list.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '150% 0px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [ref, near])
  return near
}

export function clearImageCache() {
  cache.clear()
  globalThis.caches?.delete(DISK).catch(() => {})
}

// Lets a freshly uploaded photo show right away instead of waiting for Drive to build its thumbnail.
export function primeImage(id, src) {
  for (const size of ['s', 'l']) {
    cache.set(`${size}:${id}`, src)
    toDisk(`${size}:${id}`, src)
  }
}
