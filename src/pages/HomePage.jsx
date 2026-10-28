import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import Hero from '../components/Hero.jsx'
import EntryCard from '../components/EntryCard.jsx'
import DetailView from '../components/DetailView.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import Celebration from '../components/Celebration.jsx'
import Button from '../components/Button.jsx'
import { GallerySkeleton } from '../components/Skeleton.jsx'
import { api } from '../lib/api.js'
import { navigate } from '../lib/router.js'
import { page } from '../lib/motion.js'
import { useSession } from '../state/session.jsx'

export default function HomePage() {
  const { user, votedEntryId, setVotedEntryId } = useSession()
  const [campaign, setCampaign] = useState(null)
  const [entries, setEntries] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [openId, setOpenId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [voteError, setVoteError] = useState('')
  const [errorKey, setErrorKey] = useState(0)
  const [celebrate, setCelebrate] = useState(null)
  const galleryRef = useRef(null)

  const load = useCallback(async () => {
    setLoadError('')
    try {
      const [c, e] = await Promise.all([api.campaign(), api.entries()])
      setCampaign(c)
      setEntries(e)
    } catch (err) {
      setLoadError(err.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const closed = campaign ? Date.now() > new Date(campaign.endsAt).getTime() : false
  const openEntry = entries?.find((e) => e.id === openId)
  const selectedEntry = entries?.find((e) => e.id === selectedId)

  const requestVote = (id) => {
    if (!user) {
      navigate('/login')
      return
    }
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
      const res = await api.vote(id)
      if (!res?.ok) throw new Error('เซิร์ฟเวอร์ยังไม่ยืนยันการบันทึกคะแนน')
      setVotedEntryId(res.entryId ?? id)
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

  return (
    <motion.main {...page} className="page">
      <Hero
        campaign={campaign}
        entryCount={entries?.length ?? 0}
        onStart={() => galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />

      <section ref={galleryRef} className="section" id="gallery" aria-labelledby="gallery-title">
        <div className="section-head">
          <div>
            <h2 id="gallery-title">ผลงานทั้งหมด</h2>
            <p>{campaign?.subtitle ?? 'แตะที่ภาพเพื่อดูรายละเอียดและโหวต'}</p>
          </div>
          {votedEntryId && <span className="pill pill-success">คุณโหวตแล้ว · ขอบคุณที่ร่วมสร้างช่วงเวลานี้</span>}
          {closed && !votedEntryId && <span className="pill">ปิดรับโหวตแล้ว</span>}
        </div>

        {loadError ? (
          <div className="empty">
            <p>{loadError}</p>
            <Button variant="ghost" onClick={load}>
              ลองโหลดใหม่
            </Button>
          </div>
        ) : !entries ? (
          <GallerySkeleton />
        ) : entries.length === 0 ? (
          <div className="empty">
            <p>ยังไม่มีผลงานในกิจกรรมนี้</p>
          </div>
        ) : (
          <LayoutGroup>
            <div className="gallery">
              {entries.map((entry, i) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  showCounts={campaign?.showCounts}
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
                  showCounts={campaign?.showCounts}
                  votedEntryId={votedEntryId}
                  closed={closed}
                  user={user}
                  onClose={closeDetail}
                  onVote={requestVote}
                />
              )}
            </AnimatePresence>
          </LayoutGroup>
        )}
      </section>

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
      <AnimatePresence>{celebrate && <Celebration key="celebrate" entry={celebrate} onDone={endCelebrate} />}</AnimatePresence>
    </motion.main>
  )
}
