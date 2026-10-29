import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import EntryCard from './EntryCard.jsx'
import DetailView from './DetailView.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import Celebration from './Celebration.jsx'
import Button from './Button.jsx'
import { GallerySkeleton } from './Skeleton.jsx'
import { api } from '../lib/api.js'
import { navigate } from '../lib/router.js'

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
  const showCounts = campaign.showCounts || user.role === 'admin'

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

  const openEntry = entries?.find((e) => e.id === openId)
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

  return (
    <>
      {votedEntryId && <p className="pill pill-success voted-pill">คุณโหวตแล้ว · ขอบคุณที่ร่วมสร้างช่วงเวลานี้</p>}
      <LayoutGroup>
        <div className="gallery">
          {entries.map((entry, i) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              index={i}
              showCounts={showCounts}
              isVoted={votedEntryId === entry.id}
              isSelected={selectedId === entry.id}
              onOpen={setOpenId}
            />
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
