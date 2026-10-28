import { ENV } from '../config.js'
import { store } from './storage.js'

const TOKEN_KEY = 'vt-session'
export const MOCK_FAIL_KEY = 'vt-mock-fail-votes'

export const session = {
  get token() {
    return store.get(TOKEN_KEY)
  },
  set token(value) {
    store.set(TOKEN_KEY, value)
  },
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  if (!ENV.apiBase) throw new ApiError('ยังไม่ได้ตั้งค่า VITE_API_BASE', 0)
  const headers = { Accept: 'application/json' }
  if (body) headers['Content-Type'] = 'application/json'
  if (auth && session.token) headers.Authorization = `Bearer ${session.token}`
  if (ENV.isMock && store.get(MOCK_FAIL_KEY, sessionStorage) === '1') headers['X-Mock-Fail'] = '1'

  let res
  try {
    res = await fetch(`${ENV.apiBase}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw new ApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง', 0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) session.token = null
    throw new ApiError(data.message || `เกิดข้อผิดพลาด (${res.status})`, res.status, data)
  }
  return data
}

export const api = {
  campaign: () => request('/campaign', { auth: false }),
  entries: () => request('/entries', { auth: false }),
  me: () => request('/me'),
  exchangeLineCode: (payload) => request('/auth/line', { method: 'POST', body: payload, auth: false }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  vote: (entryId) => request('/votes', { method: 'POST', body: { entryId } }),
  adminStats: () => request('/admin/stats'),
}
