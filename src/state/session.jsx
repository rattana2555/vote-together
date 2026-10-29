import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, session } from '../lib/api.js'
import { clearImageCache } from '../lib/images.js'
import { lineLogout, resumeLineLogin, startLineLogin, takeReturnTo } from '../lib/lineAuth.js'
import { navigate } from '../lib/router.js'
import { store } from '../lib/storage.js'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [votedEntryId, setVotedEntryId] = useState(null)
  const [ready, setReady] = useState(false)
  const [welcome, setWelcome] = useState(false)
  const [loginError, setLoginError] = useState('')

  const completeLogin = useCallback(async (idToken) => {
    const res = await api.login(idToken)
    session.token = res.token
    setUser(res.user)
    setVotedEntryId(res.votedEntryId ?? null)
    setLoginError('')
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
          setVotedEntryId(me.votedEntryId ?? null)
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
        await completeLogin(idToken)
        navigate(takeReturnTo() || returnTo, { replace: true })
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
      welcome,
      dismissWelcome: () => setWelcome(false),
    }),
    [user, ready, votedEntryId, login, logout, loginError, welcome],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export const useSession = () => useContext(SessionContext)
