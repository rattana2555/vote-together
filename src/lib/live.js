import { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'

const POLL_MS = 20000

// Polls a campaign's live results while the page is open and the tab is visible.
export function useLiveResults(campaignId, enabled) {
  const [live, setLive] = useState(null)

  const refresh = useCallback(async () => {
    try {
      setLive(await api.results(campaignId))
    } catch {
      /* keep the last result; the next tick retries */
    }
  }, [campaignId])

  useEffect(() => {
    if (!enabled) return
    let alive = true
    let timer = 0
    const tick = async () => {
      if (document.visibilityState === 'visible') await refresh()
      if (alive) timer = setTimeout(tick, POLL_MS)
    }
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, refresh])

  return [live, refresh]
}

export const RESULT_HINT = {
  afterVote: 'โหวตหรือตอบแล้วจะเห็นผลคะแนนสด',
  afterClose: 'ผลคะแนนจะแสดงหลังปิดโหวต',
}

export const RESULT_MODE_LABEL = {
  always: 'ทุกคนเห็นตลอด',
  afterVote: 'เห็นหลังโหวต/ตอบแล้ว',
  afterClose: 'เห็นหลังปิดโหวต',
  never: 'ไม่ให้เห็น',
}
