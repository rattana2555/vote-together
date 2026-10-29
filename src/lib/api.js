// All calls go to one endpoint (the Apps Script web app) as POST {action, token, ...}.
// text/plain keeps it a "simple" CORS request, which Apps Script can answer.
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

async function call(action, payload = {}, { auth = true } = {}) {
  if (!ENV.apiBase) throw new ApiError('ระบบยังไม่เปิดใช้งาน', 0)
  const body = { action, ...payload }
  if (auth && session.token) body.token = session.token
  if (ENV.isMock && store.get(MOCK_FAIL_KEY, sessionStorage) === '1') body.mockFail = true

  let res
  try {
    res = await fetch(ENV.apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
    })
  } catch {
    throw new ApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง', 0)
  }
  const data = await res.json().catch(() => ({ ok: false, message: `เซิร์ฟเวอร์ตอบกลับผิดรูปแบบ (${res.status})` }))
  if (!res.ok || data.ok === false) {
    const status = data.status || res.status
    if (status === 401) session.token = null
    throw new ApiError(data.message || `เกิดข้อผิดพลาด (${status})`, status, data)
  }
  return data
}

export const api = {
  campaign: () => call('campaign', {}, { auth: false }).then((d) => d.campaign),
  login: (idToken) => call('login', { idToken }, { auth: false }),
  me: () => call('me'),
  entries: () => call('entries').then((d) => d.entries),
  images: (ids, size, campaignId) => call('images', { ids, size, campaignId }).then((d) => d.images || {}),
  vote: (entryId) => call('vote', { entryId }),
  stats: (campaignId) => call('stats', { campaignId }),
  campaigns: () => call('campaigns').then((d) => d.campaigns),
  campaignEntries: (campaignId) => call('campaignEntries', { campaignId }),
  saveCampaign: (campaign) => call('saveCampaign', { campaign }),
  activateCampaign: (campaignId) => call('activateCampaign', { campaignId }),
  addEntry: (entry) => call('addEntry', entry).then((d) => d.entry),
  deleteEntry: (campaignId, entryId) => call('deleteEntry', { campaignId, entryId }),
  employees: () => call('employees').then((d) => d.employees),
  admins: () => call('admins').then((d) => d.admins),
  saveAdmins: (empIds) => call('saveAdmins', { empIds }).then((d) => d.admins),
}
