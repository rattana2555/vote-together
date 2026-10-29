import { motion } from 'framer-motion'
import DriveImg from './DriveImg.jsx'
import { easeOut, spring } from '../lib/motion.js'

// Live leaderboard for photo votes; rows glide to their new place when the order changes.
export default function LiveRanking({ data, votedEntryId }) {
  const max = data.entries[0]?.votes || 1
  return (
    <ol className="rank live-rank">
      {data.entries.map((e, i) => {
        const share = data.total ? Math.round((e.votes / data.total) * 100) : 0
        return (
          <motion.li key={e.id} layout transition={spring} className={`rank-row${e.id === votedEntryId ? ' is-mine' : ''}`}>
            <span className={`rank-no${i < 3 && e.votes ? ' is-top' : ''}`}>{i + 1}</span>
            <DriveImg id={e.imageId} alt="" className="rank-thumb" />
            <div className="rank-body">
              <div className="rank-top">
                <b title={e.title}>{e.title}</b>
                <motion.span key={e.votes} initial={{ scale: 1.25 }} animate={{ scale: 1 }}>
                  {e.votes.toLocaleString('th-TH')} · {share}%
                </motion.span>
              </div>
              <span className="rank-author" title={e.author}>
                {e.author}
                {e.id === votedEntryId && ' · โหวตของคุณ'}
              </span>
              <span className="rank-bar">
                <motion.i initial={false} animate={{ scaleX: e.votes / max }} transition={{ duration: 0.8, ease: easeOut }} />
              </span>
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}
