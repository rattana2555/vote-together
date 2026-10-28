// LINE login via LIFF. The browser only gets a LINE ID token; the Apps Script backend verifies it
// with LINE and checks the userId against the LINE_USERS sheet before issuing our own session.
import { ENV } from '../config.js'
import { store } from './storage.js'
import { toUrl } from './router.js'

const RETURN_KEY = 'vt-return-to'
const LIFF_SDK = 'https://static.line-scdn.net/liff/edge/2/sdk.js'

let sdkPromise = null
let ready = false

function loadSdk() {
  if (window.liff) return Promise.resolve(window.liff)
  sdkPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = LIFF_SDK
    s.onload = () => resolve(window.liff)
    s.onerror = () => {
      sdkPromise = null
      reject(new Error('โหลด LINE ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'))
    }
    document.head.appendChild(s)
  })
  return sdkPromise
}

async function initLiff() {
  const liff = await loadSdk()
  if (!ready) {
    await liff.init({ liffId: ENV.liffId })
    ready = true
  }
  return liff
}

const loginUrl = () => `${location.origin}${toUrl('/login')}`

export async function startLineLogin(returnTo = '/', { fresh = false } = {}) {
  store.set(RETURN_KEY, returnTo, sessionStorage)
  if (ENV.isMock) {
    location.assign(`${ENV.mockAuthorizeUrl}?redirect_uri=${encodeURIComponent(loginUrl())}`)
    return null
  }
  const liff = await initLiff()
  if (fresh && liff.isLoggedIn()) liff.logout()
  if (liff.isLoggedIn()) return liff.getIDToken()
  liff.login({ redirectUri: loginUrl() })
  return null
}

// Called on app start: picks up the result of a LINE login redirect, or logs in silently inside the LINE app.
// Memoized because the redirect params are consumed on first read.
let resumed = null
export const resumeLineLogin = () => (resumed ||= readLoginResult())

async function readLoginResult() {
  const q = new URLSearchParams(location.search)
  if (ENV.isMock) {
    const token = q.get('mock_id_token')
    const error = q.get('error')
    if (token || error) history.replaceState({}, '', location.pathname)
    if (error) throw new Error('คุณยกเลิกการเข้าสู่ระบบด้วย LINE')
    return token
  }
  const fromLine = q.has('code') || q.has('liffClientId') || q.has('liff.state') || /\bLine\//i.test(navigator.userAgent)
  if (!ENV.liffId || !fromLine) return null
  const liff = await initLiff()
  return liff.isLoggedIn() ? liff.getIDToken() : null
}

export function takeReturnTo() {
  const to = store.get(RETURN_KEY, sessionStorage)
  store.set(RETURN_KEY, null, sessionStorage)
  return to
}

export function lineLogout() {
  if (ready && window.liff?.isLoggedIn()) window.liff.logout()
}
