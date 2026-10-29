import { AnimatePresence, motion } from 'framer-motion'

export default function LiveBadge({ updatedAt }) {
  const time = updatedAt ? new Date(updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''
  return (
    <span className="live-badge" role="status" aria-live="polite">
      <i aria-hidden="true" />
      อัปเดตสด
      <AnimatePresence mode="wait">
        <motion.span key={time} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}>
          {time && ` · ${time}`}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
