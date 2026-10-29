import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Hero from '../components/Hero.jsx'
import Button from '../components/Button.jsx'
import { api } from '../lib/api.js'
import { ENV } from '../config.js'
import { linkProps } from '../lib/router.js'
import { easeOut, page } from '../lib/motion.js'
import { useSession } from '../state/session.jsx'

export const SOURCE_LABEL = { app: 'โหวตภาพ', sheet: 'โหวตภาพ', form: 'แบบสอบถาม' }

export const fmtDeadline = (c) =>
  c.endsAt
    ? `${c.closed ? 'ปิดแล้วเมื่อ' : 'ปิด'} ${new Date(c.endsAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
    : 'ยังไม่กำหนดวันปิด'

function TypeIcon({ source }) {
  return source === 'form' ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 16l-5-5-8 9" />
    </svg>
  )
}

export default function HomePage() {
  const { user, ready } = useSession()
  const [campaigns, setCampaigns] = useState(null)
  const [error, setError] = useState('')
  const listRef = useRef(null)

  const load = useCallback(async () => {
    setError('')
    try {
      setCampaigns(await api.openCampaigns())
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    if (ENV.apiBase && ready) load()
  }, [load, ready, user])

  let body
  if (!ENV.apiBase) {
    body = (
      <div className="empty">
        <p>ระบบโหวตกำลังจะเปิดเร็ว ๆ นี้</p>
      </div>
    )
  } else if (error) {
    body = (
      <div className="empty">
        <p>{error}</p>
        <Button variant="ghost" onClick={load}>
          ลองโหลดใหม่
        </Button>
      </div>
    )
  } else if (!campaigns) {
    body = (
      <div className="event-list">
        {[0, 1, 2].map((i) => (
          <div key={i} className="event-card shimmer" style={{ height: 112 }} />
        ))}
      </div>
    )
  } else if (!campaigns.length) {
    body = (
      <div className="empty">
        <p>ตอนนี้ยังไม่มีกิจกรรมที่เปิดให้โหวต</p>
      </div>
    )
  } else {
    body = (
      <div className="event-list">
        {campaigns.map((c, i) => (
          <motion.a
            key={c.id}
            {...linkProps(`/c/${c.id}`)}
            className={`event-card${c.closed ? ' is-closed' : ''}`}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: i * 0.07, ease: easeOut }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className={`event-icon ${c.source === 'form' ? 'is-form' : ''}`}>
              <TypeIcon source={c.source} />
            </span>
            <span className="event-body">
              <span className="event-type">
                {SOURCE_LABEL[c.source]}
                {c.done === true && <span className="event-status"> · ร่วมแล้ว ✓</span>}
                {c.done === false && !c.closed && <span className="event-status is-todo"> · ยังไม่ได้ร่วม</span>}
              </span>
              <b title={c.title}>{c.title}</b>
              {c.subtitle && <span className="event-sub">{c.subtitle}</span>}
              <span className="event-meta">{fmtDeadline(c)}</span>
            </span>
            <span className="event-side">
              {c.done === true && <span className="tag tag-live">ร่วมแล้ว ✓</span>}
              {c.done === false && !c.closed && <span className="tag tag-soft">ยังไม่ได้ร่วม</span>}
              {c.closed && <span className="tag">ปิดแล้ว</span>}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </span>
          </motion.a>
        ))}
      </div>
    )
  }

  return (
    <motion.main {...page} className="page">
      <Hero count={campaigns?.length} onStart={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
      <section ref={listRef} className="section" id="events" aria-labelledby="events-title">
        <div className="section-head">
          <div>
            <h2 id="events-title">กิจกรรมที่เปิดอยู่</h2>
            <p>เลือกกิจกรรมเพื่อเข้าไปโหวตหรือตอบคำถาม 1 บัญชี LINE ร่วมได้ 1 ครั้งต่อกิจกรรม</p>
          </div>
        </div>
        {body}
      </section>
    </motion.main>
  )
}
