import { useEffect } from 'react'
import { motion } from 'framer-motion'
import Button from './Button.jsx'
import DriveImg, { ratio, ratioNum } from './DriveImg.jsx'
import { softSpring, spring } from '../lib/motion.js'

export default function DetailView({ entry, showCounts, votedEntryId, closed, user, onClose, onVote }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const isMine = votedEntryId === entry.id
  const hasVoted = Boolean(votedEntryId)

  let action
  if (isMine) action = <div className="vote-done">คุณโหวตผลงานนี้แล้ว</div>
  else if (hasVoted) action = <p className="vote-note">คุณใช้สิทธิ์โหวตไปแล้วในกิจกรรมนี้</p>
  else if (closed) action = <p className="vote-note">ปิดรับโหวตแล้ว</p>
  else
    action = (
      <Button size="lg" className="btn-block" onClick={() => onVote(entry.id)}>
        {user ? 'โหวตผลงานนี้' : 'เข้าสู่ระบบเพื่อโหวต'}
      </Button>
    )

  return (
    <motion.div className="detail" role="dialog" aria-modal="true" aria-label={entry.title}>
      <motion.div
        className="detail-backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />
      <motion.div
        className="detail-sheet"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => (info.offset.y > 120 || info.velocity.y > 700) && onClose()}
      >
        <motion.div
          layoutId={`img-${entry.id}`}
          className="detail-media"
          style={{ aspectRatio: ratio(entry), '--ar': ratioNum(entry) }}
          transition={softSpring}
        >
          <DriveImg id={entry.imageId} size="l" alt={entry.title} />
        </motion.div>
        <motion.div
          className="detail-info"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0, transition: { ...spring, delay: 0.12 } }}
          exit={{ opacity: 0, y: 16, transition: { duration: 0.15 } }}
        >
          <span className="grab" aria-hidden="true" />
          <h2>{entry.title}</h2>
          <p className="detail-author">โดย {entry.author}</p>
          {entry.description && <p className="detail-desc">{entry.description}</p>}
          {showCounts && typeof entry.votes === 'number' && (
            <p className="detail-votes">
              <b>{entry.votes.toLocaleString('th-TH')}</b> โหวต
            </p>
          )}
          <div className="detail-action">{action}</div>
        </motion.div>
        <motion.button
          type="button"
          className="detail-close"
          onClick={onClose}
          aria-label="ปิด"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          whileTap={{ scale: 0.9 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
