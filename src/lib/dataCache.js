// Keeps the last campaign list / campaign / entries on this device so pages render at once,
// then refreshes from the backend (stale-while-revalidate). Also shares in-flight requests,
// so the home page can start loading a campaign's entries before it is opened.
import { api, session } from './api.js'
import { loadImage } from './images.js'
import { store } from './storage.js'

const PREFIX = 'vt-data:'
const MAX_AGE = 3 * 24 * 3600 * 1000
const inflight = new Map()

const who = () => (session.token || 'anon').slice(-16)
const keyOf = (name) => `${PREFIX}${who()}:${name}`

export function readCached(name) {
  try {
    const hit = JSON.parse(store.get(keyOf(name)) || 'null')
    return hit && Date.now() - hit.at < MAX_AGE ? hit.v : null
  } catch {
    return null
  }
}

export function writeCached(name, value) {
  try {
    store.set(keyOf(name), JSON.stringify({ at: Date.now(), v: value }))
  } catch {
    /* storage full: skip */
  }
}

export function clearDataCache() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* storage unavailable */
  }
  inflight.clear()
}

// One request per name at a time; the result is written to the device cache.
function fetchShared(name, run) {
  const k = keyOf(name)
  if (inflight.has(k)) return inflight.get(k)
  const p = run()
    .then((v) => {
      writeCached(name, v)
      return v
    })
    .finally(() => setTimeout(() => inflight.delete(k), 1500))
  inflight.set(k, p)
  return p
}

export const fetchCampaigns = () => fetchShared('campaigns', () => api.openCampaigns())

export function fetchCampaign(id) {
  return fetchShared(`campaign:${id}`, () => api.campaign(id))
}

// Campaign as last seen on the home list or the campaign page, so the page can draw before the backend answers.
export function cachedCampaign(id) {
  return readCached(`campaign:${id}`) || (readCached('campaigns') || []).find((c) => c.id === id) || null
}

export function rememberCampaign(c) {
  if (c?.id) writeCached(`campaign:${c.id}`, c)
}

export function fetchEntries(id) {
  return fetchShared(`entries:${id}`, () => api.entries(id))
}

// Warm a gallery while the person is still on the list: entries first, then the first screen of photos.
export function prefetchGallery(id, photos = 6) {
  fetchEntries(id)
    .then((d) => (d.entries || []).slice(0, photos).forEach((e) => e.imageId && loadImage(e.imageId, 's')))
    .catch(() => {})
}
