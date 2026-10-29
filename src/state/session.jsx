import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, session } from '../lib/api.js'
import { clearImageCache } from '../lib/images.js'
import { lineLogout, resumeLineLogin, startLineLogin, takeReturnTo } from '../lib/lineAuth.js'
import { navigate } from '../lib/router.js'
import { store } from '../lib/storage.js'

const SessionContext = createContext(null)

// First-time LINE HR verification survives a hop to the LINE chat and back (the webview may reload).
const LINK_KEY = 'vt-pending-link'
const readPendingLink = () => {
  try {
    const p = JSON.parse(store.get(LINK_KEY) || 'null')
    return p && p.until > Date.now() ? p : null
  } catch {
    return null
  }
}

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [votedEntryId, setVotedEntryId] = useState(null)
  const [ready, setReady] = useState(false)
  const [welcome, setWelcome] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [pendingLink, setPendingLinkState] = useState(readPendingLink)

  const setPendingLink = useCallback((p) => {
    store.set(LINK_KEY, p ? JSON.stringify({ ...p, until: Date.now() + 14 * 60 * 1000 }) : null)
    setPendingLinkState(p ? { ...p, until: Date.now() + 14 * 60 * 1000 } : null)
  }, [])

  const finishLogin = useCallback(
    (res) => {
      session.token = res.token
      setUser(res.user)
      setVotedEntryId(res.votedEntryId ?? null)
      setLoginError('')
      setPendingLink(null)
      setWelcome(true)
    },
    [setPendingLink],
  )

  // true = logged in, false = waiting for the LINE HR chat code
  const completeLogin = useCallback(
    async (idToken) => {
      const res = await api.login(idToken)
      if (res.needsLink) {
        setPendingLink({ code: res.code, oaId: res.oaId, lineName: res.lineName, linkToken: res.linkToken })
        return false
      }
      finishLogin(res)
      return true
    },
    [finishLogin, setPendingLink],
  )

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (session.token) {
        try {
          const me = await api.me()
          if (!alive) return
          setUser(me.user)
          setVotedEntryId(me.votedEntryId ?? null)
        } catch {
          /* expired session: fall through to LINE */
        }
      }
      if (!session.token) {
        try {
          const idToken = await resumeLineLogin()
          if (idToken && alive) {
            const done = await completeLogin(idToken)
            navigate(done ? takeReturnTo() || '/' : '/login', { replace: true })
          }
        } catch (err) {
          if (alive) setLoginError(err.message || 'เข้าสู่ระบบไม่สำเร็จ')
        }
      }
      if (alive) setReady(true)
    })()
    return () => {
      alive = false
    }
  }, [completeLogin])

  const login = useCallback(
    async (returnTo = '/', opts) => {
      setLoginError('')
      try {
        const idToken = await startLineLogin(returnTo, opts)
        if (!idToken) return
        const done = await completeLogin(idToken)
        if (done) navigate(takeReturnTo() || returnTo, { replace: true })
      } catch (err) {
        setLoginError(err.message || 'เข้าสู่ระบบไม่สำเร็จ')
        throw err
      }
    },
    [completeLogin],
  )

  const logout = useCallback(() => {
    session.token = null
    lineLogout()
    clearImageCache()
    setUser(null)
    setVotedEntryId(null)
    navigate('/')
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      votedEntryId,
      setVotedEntryId,
      login,
      logout,
      loginError,
      setLoginError,
      pendingLink,
      cancelLink: () => setPendingLink(null),
      finishLogin,
      welcome,
      dismissWelcome: () => setWelcome(false),
    }),
    [user, ready, votedEntryId, login, logout, loginError, pendingLink, setPendingLink, finishLogin, welcome],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export const useSession = () => useContext(SessionContext)
