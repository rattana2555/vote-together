// Drive images are proxied by the backend (files stay private). Requests made in the same tick are
// batched, and results are kept in memory for the session.
import { useEffect, useState } from 'react'
import { api } from './api.js'

const BATCH = 6
const cache = new Map()
const waiting = new Map()
let queue = []
let timer = 0
let scope = null

// Admin screens show entries of non-active campaigns; the backend only serves those when told which campaign.
export function setImageScope(campaignId) {
  scope = campaignId || null
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
            if (src) cache.set(key, src)
            waiting.get(key)?.forEach((fn) => fn(src))
            waiting.delete(key)
          })
        })
    }
  })
}

export function loadImage(id, size = 's') {
  const key = `${size}:${id}`
  if (cache.has(key)) return Promise.resolve(cache.get(key))
  return new Promise((resolve) => {
    if (!waiting.has(key)) {
      waiting.set(key, [])
      queue.push({ id, size })
      timer ||= setTimeout(flush, 30)
    }
    waiting.get(key).push(resolve)
  })
}

export const cachedImage = (id, size = 's') => cache.get(`${size}:${id}`) || null

export function useDriveImage(id, size = 's') {
  const [src, setSrc] = useState(() => (id ? cachedImage(id, size) : null))
  useEffect(() => {
    if (!id) return
    let alive = true
    setSrc(cachedImage(id, size))
    loadImage(id, size).then((s) => alive && setSrc(s))
    return () => {
      alive = false
    }
  }, [id, size])
  return src
}

export function clearImageCache() {
  cache.clear()
}

// Lets a freshly uploaded photo show right away instead of waiting for Drive to build its thumbnail.
export function primeImage(id, src) {
  cache.set(`s:${id}`, src)
  cache.set(`l:${id}`, src)
}
