import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import EntryCard from './EntryCard.jsx'
import DetailView from './DetailView.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import Celebration from './Celebration.jsx'
import Button from './Button.jsx'
import { GallerySkeleton } from './Skeleton.jsx'
import LiveBadge from './LiveBadge.jsx'
import LiveRanking from './LiveRanking.jsx'
import { RESULT_HINT, useLiveResults } from '../lib/live.js'
import { spring } from '../lib/motion.js'
import { api } from '../lib/api.js'
import { navigate } from '../lib/router.js'

// Masonry with real columns (not CSS `columns`): WebKit, incl. LINE's in-app browser on iPhone,
// never reports items in the 2nd+ CSS column as visible, so they stayed hidden.
const COLUMN_QUERIES = [
  ['(min-width: 1080px)', 4],
  ['(min-width: 720px)', 3],
]
const columnCount = () => COLUMN_QUERIES.find(([q]) => matchMedia(q).matches)?.[1] ?? 2

function useColumnCount() {
  const [n, setN] = useState(columnCount)
  useEffect(() => {
    const update = () => setN(columnCount())
    const lists = COLUMN_QUERIES.map(([q]) => matchMedia(q))
    lists.forEach((m) => m.addEventListener('change', update))
    return () => lists.forEach((m) => m.removeEventListener('change', update))
  }, [])
  return n
}

// Each photo goes to the currently shortest column, using its aspect ratio as height.
function balanceColumns(items, n) {
  const cols = Array.from({ length: n }, () => ({ h: 0, items: [] }))
  items.forEach((e) => {
    const col = cols.reduce((a, b) => (b.h < a.h ? b : a))
    col.items.push(e)
    col.h += (e.width && e.height ? e.height / e.width : 1.25) + 0.3
  })
  return cols.map((c) => c.items)
}

// Photo-contest campaigns: pick one entry, confirm, and the vote counts only once the backend saved it.
export default function GalleryView({ campaign, user }) {
  const [entries, setEntries] = useState(null)
  const [votedEntryId, setVotedEntryId] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [openId, setOpenId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [voteError, setVoteError] = useState('')
  const [errorKey, setErrorKey] = useState(0)
  const [celebrate, setCelebrate] = useState(null)
  const [tab, setTab] = useState('gallery')
  const isAdmin = user.role === 'admin'
  const [live, refreshLive] = useLiveResults(campaign.id, isAdmin || (campaign.resultsMode || 'never') !== 'never')
  const liveVotes = live?.visible && live.data?.entries ? Object.fromEntries(live.data.entries.map((e) => [e.id, e.votes])) : null
  const showCounts = Boolean(liveVotes) || Boolean(entries?.some((e) => typeof e.votes === 'number'))
  const shown = liveVotes && entries ? entries.map((e) => ({ ...e, votes: liveVotes[e.id] ?? e.votes })) : entries
  const colCount = useColumnCount()
  const columns = useMemo(() => balanceColumns(shown || [], colCount), [shown, colCount])

  const load = useCallback(async () => {
    setLoadError('')
    try {
      const d = await api.entries(campaign.id)
      setEntries(d.entries)
      setVotedEntryId(d.votedEntryId ?? null)
    } catch (err) {
      setLoadError(err.message)
    }
  }, [campaign.id])

  useEffect(() => {
    load()
  }, [load])

  const openEntry = shown?.find((e) => e.id === openId)
  const selectedEntry = entries?.find((e) => e.id === selectedId)

  const requestVote = (id) => {
    setVoteError('')
    setStatus('idle')
    setSelectedId(id)
    setOpenId(null)
  }

  const cancelVote = useCallback(() => {
    setSelectedId(null)
    setStatus('idle')
    setVoteError('')
  }, [])

  const confirmVote = async () => {
    const id = selectedId
    setStatus('submitting')
    setVoteError('')
    try {
      const res = await api.vote(campaign.id, id)
      if (!res?.ok || res.entryId !== id) throw new Error('เซิร์ฟเวอร์ยังไม่ยืนยันการบันทึกคะแนน')
      setVotedEntryId(res.entryId)
      if (typeof res.votes === 'number') {
        setEntries((list) => list.map((e) => (e.id === id ? { ...e, votes: res.votes } : e)))
      }
      setStatus('success')
      setSelectedId(null)
      setCelebrate(entries.find((e) => e.id === id))
      refreshLive()
    } catch (err) {
      if (err.status === 409 && err.data?.votedEntryId) setVotedEntryId(err.data.votedEntryId)
      if (err.status === 401) {
        navigate('/login')
        return
      }
      setStatus('error')
      setVoteError(err.message || 'บันทึกคะแนนไม่สำเร็จ กรุณาลองอีกครั้ง')
      setErrorKey((k) => k + 1)
    }
  }

  const closeDetail = useCallback(() => setOpenId(null), [])
  const endCelebrate = useCallback(() => setCelebrate(null), [])

  if (loadError) {
    return (
      <div className="empty">
        <p>{loadError}</p>
        <Button variant="ghost" onClick={load}>
          ลองโหลดใหม่
        </Button>
      </div>
    )
  }
  if (!entries) return <GallerySkeleton />
  if (!entries.length) {
    return (
      <div className="empty">
        <p>ยังไม่มีผลงานในกิจกรรมนี้</p>
      </div>
    )
  }

  const hint = !live?.visible && RESULT_HINT[campaign.resultsMode]

  return (
    <>
      <div className="view-bar">
        {live?.visible ? (
          <div className="tabs" role="tablist">
            {[
              ['gallery', 'ผลงาน'],
              ['ranking', 'อันดับตอนนี้'],
            ].map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-on' : ''} onClick={() => setTab(key)}>
                {tab === key && <motion.span layoutId="gallery-tab" className="tab-pill" transition={spring} />}
                <span>{label}</span>
              </button>
            ))}
          </div>
        ) : (
          hint && <p className="result-hint">{hint}</p>
        )}
        {live?.visible && <LiveBadge updatedAt={live.updatedAt} />}
      </div>
      {votedEntryId && <p className="pill pill-success voted-pill">คุณโหวตแล้ว · ขอบคุณที่ร่วมสร้างช่วงเวลานี้</p>}

      {tab === 'ranking' && live?.visible ? (
        <LiveRanking data={live.data} votedEntryId={votedEntryId} />
      ) : (
      <LayoutGroup>
        <div className="gallery" style={{ '--cols': columns.length }}>
          {columns.map((col, c) => (
            <div key={c} className="gallery-col">
              {col.map((entry, i) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  index={i * columns.length + c}
                  showCounts={showCounts}
                  isVoted={votedEntryId === entry.id}
                  isSelected={selectedId === entry.id}
                  onOpen={setOpenId}
                />
              ))}
            </div>
          ))}
        </div>
        <AnimatePresence>
          {openEntry && (
            <DetailView
              key={openEntry.id}
              entry={openEntry}
              showCounts={showCounts}
              votedEntryId={votedEntryId}
              closed={campaign.closed}
              user={user}
              onClose={closeDetail}
              onVote={requestVote}
            />
          )}
        </AnimatePresence>
      </LayoutGroup>
      )}

      <AnimatePresence>
        {selectedEntry && (
          <ConfirmDialog
            key="confirm"
            entry={selectedEntry}
            status={status}
            error={voteError}
            errorKey={errorKey}
            onConfirm={confirmVote}
            onCancel={cancelVote}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {celebrate && <Celebration key="celebrate" message={`ขอบคุณที่ร่วมโหวตให้ “${celebrate.title}”`} onDone={endCelebrate} />}
      </AnimatePresence>
    </>
  )
}
