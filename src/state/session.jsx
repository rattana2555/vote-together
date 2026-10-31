import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, session } from '../lib/api.js'
import { clearImageCache } from '../lib/images.js'
import { lineLogout, resumeLineLogin, startLineLogin, takeReturnTo } from '../lib/lineAuth.js'
import { navigate } from '../lib/router.js'
import { store } from '../lib/storage.js'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [welcome, setWelcome] = useState(false)
  const [loginError, setLoginError] = useState('')
  // Not registered with LINE HR yet: the login page shows a button to the LINE HR chat.
  const [notRegistered, setNotRegistered] = useState(null)
  const fail = useCallback((err) => {
    setLoginError(err.message || 'เข้าสู่ระบบไม่สำเร็จ')
    setNotRegistered(
      err.data?.code === 'NOT_REGISTERED'
        ? { lineHrUrl: err.data.lineHrUrl || '', requestToken: err.data.requestToken, requested: Boolean(err.data.requested), lineName: err.data.lineName }
        : null,
    )
    // LIFF can hand back an expired ID token; drop the LINE session so the next try gets a fresh one
    if (err.data?.code === 'LINE_VERIFY_FAILED') lineLogout()
  }, [])

  const completeLogin = useCallback(async (idToken) => {
    const res = await api.login(idToken)
    session.token = res.token
    setUser(res.user)
    setLoginError('')
    setNotRegistered(null)
    setWelcome(true)
  }, [])

  useEffect(() => {
    store.set('vt-pending-link', null) // left over from v3.1
    let alive = true
    ;(async () => {
      if (session.token) {
        try {
          const me = await api.me()
          if (!alive) return
          setUser(me.user)
        } catch {
          /* expired session: fall through to LINE */
        }
      }
      if (!session.token) {
        try {
          const idToken = await resumeLineLogin()
          if (idToken && alive) {
            await completeLogin(idToken)
            navigate(takeReturnTo() || '/', { replace: true })
          }
        } catch (err) {
          if (alive) {
            fail(err)
            if (err.data?.code === 'NOT_REGISTERED') navigate('/login', { replace: true })
          }
        }
      }
      if (alive) setReady(true)
    })()
    return () => {
      alive = false
    }
  }, [completeLogin, fail])

  const login = useCallback(
    async function login(returnTo = '/', opts) {
      setLoginError('')
      setNotRegistered(null)
      try {
        const idToken = await startLineLogin(returnTo, opts)
        if (!idToken) return
        await completeLogin(idToken)
        navigate(takeReturnTo() || returnTo, { replace: true })
      } catch (err) {
        if (err.data?.code === 'LINE_VERIFY_FAILED' && !opts?.fresh) return login(returnTo, { fresh: true })
        fail(err)
        throw err
      }
    },
    [completeLogin, fail],
  )

  const logout = useCallback(() => {
    session.token = null
    lineLogout()
    clearImageCache()
    setUser(null)
    navigate('/')
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      login,
      logout,
      loginError,
      notRegistered,
      welcome,
      dismissWelcome: () => setWelcome(false),
    }),
    [user, ready, login, logout, loginError, notRegistered, welcome],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export const useSession = () => useContext(SessionContext)
