// LINE Login v2.1 authorization-code flow with PKCE.
// The browser only obtains the one-time `code`; the backend exchanges it using the channel secret
// and verifies the ID token with LINE before issuing our own session token.
import { ENV } from '../config.js'
import { store } from './storage.js'
import { toUrl } from './router.js'

const FLOW_KEY = 'vt-line-flow'

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const randomString = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)))

export const redirectUri = () => `${location.origin}${toUrl('/auth/callback')}`

export async function startLineLogin(returnTo = '/') {
  const state = randomString(16)
  const nonce = randomString(16)
  const verifier = randomString(48)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  store.set(FLOW_KEY, JSON.stringify({ state, nonce, verifier, returnTo }), sessionStorage)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: ENV.lineChannelId,
    redirect_uri: redirectUri(),
    state,
    nonce,
    scope: 'profile openid',
    code_challenge: b64url(digest),
    code_challenge_method: 'S256',
  })
  location.assign(`${ENV.lineAuthorizeUrl}?${params}`)
}

export function readLineCallback() {
  const q = new URLSearchParams(location.search)
  let flow = null
  try {
    flow = JSON.parse(store.get(FLOW_KEY, sessionStorage) || 'null')
  } catch {
    flow = null
  }
  store.set(FLOW_KEY, null, sessionStorage)

  if (q.get('error')) {
    const cancelled = q.get('error') === 'access_denied'
    return { error: cancelled ? 'คุณยกเลิกการเข้าสู่ระบบด้วย LINE' : `LINE แจ้งข้อผิดพลาด: ${q.get('error_description') || q.get('error')}` }
  }
  if (!flow || !q.get('code') || q.get('state') !== flow.state) {
    return { error: 'ลิงก์เข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ กรุณาเริ่มใหม่อีกครั้ง' }
  }
  return {
    payload: { code: q.get('code'), codeVerifier: flow.verifier, nonce: flow.nonce, redirectUri: redirectUri() },
    returnTo: flow.returnTo || '/',
  }
}
