import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, session } from '../lib/api.js'
import { startLineLogin } from '../lib/lineAuth.js'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [votedEntryId, setVotedEntryId] = useState(null)
  const [ready, setReady] = useState(false)
  const [welcome, setWelcome] = useState(false)

  const refresh = useCallback(async () => {
    if (!session.token) {
      setUser(null)
      setVotedEntryId(null)
      return
    }
    try {
      const me = await api.me()
      setUser(me.user)
      setVotedEntryId(me.votedEntryId ?? null)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setReady(true))
  }, [refresh])

  const completeLogin = useCallback(
    async (payload) => {
      const { token, user: u } = await api.exchangeLineCode(payload)
      session.token = token
      setUser(u)
      await refresh()
      setWelcome(true)
    },
    [refresh],
  )

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      /* session is dropped locally either way */
    }
    session.token = null
    setUser(null)
    setVotedEntryId(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      votedEntryId,
      setVotedEntryId,
      login: startLineLogin,
      completeLogin,
      logout,
      welcome,
      dismissWelcome: () => setWelcome(false),
    }),
    [user, ready, votedEntryId, completeLogin, logout, welcome],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export const useSession = () => useContext(SessionContext)
