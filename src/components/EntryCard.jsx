import { useState } from 'react'
import { motion } from 'framer-motion'
import { easeOut, softSpring } from '../lib/motion.js'

export default function EntryCard({ entry, index, showCounts, isVoted, isSelected, onOpen }) {
  const [loaded, setLoaded] = useState(false)
  const state = isVoted ? ' is-voted' : isSelected ? ' is-selected' : ''
  return (
    <motion.article
      className={`card${state}`}
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.55, delay: (index % 4) * 0.07, ease: easeOut }}
    >
      <motion.button
        type="button"
        className="card-hit"
        onClick={() => onOpen(entry.id)}
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.98 }}
        animate={isSelected ? { y: -8 } : { y: 0 }}
        transition={softSpring}
        aria-label={`ดูผลงาน ${entry.title} โดย ${entry.author}`}
      >
        <motion.div
          layoutId={`img-${entry.id}`}
          className={`card-media${loaded ? ' is-loaded' : ''}`}
          style={{ aspectRatio: `${entry.width} / ${entry.height}` }}
          transition={softSpring}
        >
          <img
            src={entry.image}
            alt={entry.title}
            width={entry.width}
            height={entry.height}
            loading={index < 4 ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setLoaded(true)}
          />
          {isVoted && (
            <span className="badge badge-voted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              โหวตของคุณ
            </span>
          )}
        </motion.div>
        <div className="card-meta">
          <h3>{entry.title}</h3>
          <p>
            <span>{entry.author}</span>
            {showCounts && typeof entry.votes === 'number' && (
              <span className="votes">{entry.votes.toLocaleString('th-TH')} โหวต</span>
            )}
          </p>
        </div>
      </motion.button>
      {(isSelected || isVoted) && (
        <span className="ring" aria-hidden="true">
          {isSelected && (
            <>
              <i />
              <i />
            </>
          )}
        </span>
      )}
    </motion.article>
  )
}
