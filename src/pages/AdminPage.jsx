import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Button from '../components/Button.jsx'
import { api } from '../lib/api.js'
import { navigate } from '../lib/router.js'
import { easeOut, page, rise, stagger } from '../lib/motion.js'
import { useSession } from '../state/session.jsx'

const REFRESH_MS = 15000
const fmt = (n) => n.toLocaleString('th-TH')

export default function AdminPage() {
  const { user, ready } = useSession()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      setStats(await api.adminStats())
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role !== 'admin') return
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [user, load])

  if (ready && user?.role !== 'admin') {
    return (
      <motion.main {...page} className="page section">
        <div className="empty">
          <p>หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
          <Button variant="ghost" onClick={() => navigate(user ? '/' : '/login')}>
            {user ? 'กลับไปหน้าผลงาน' : 'เข้าสู่ระบบ'}
          </Button>
        </div>
      </motion.main>
    )
  }

  const ranked = stats ? [...stats.entries].sort((a, b) => b.votes - a.votes) : []
  const max = ranked[0]?.votes || 1

  return (
    <motion.main {...page} className="page section admin">
      <div className="section-head">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            VOTE TOGETHER · Admin
          </span>
          <h2>แดชบอร์ดผลโหวต</h2>
          <p>
            {stats
              ? `อัปเดตล่าสุด ${new Date(stats.updatedAt).toLocaleTimeString('th-TH')} · รีเฟรชอัตโนมัติทุก 15 วินาที`
              : 'กำลังโหลดข้อมูล…'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={busy}>
          {busy ? <span className="spinner" aria-hidden="true" /> : null} รีเฟรช
        </Button>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!stats ? (
        <div className="stats">
          {[0, 1, 2].map((i) => (
            <div key={i} className="stat shimmer" style={{ height: 112 }} />
          ))}
        </div>
      ) : (
        <>
          <motion.div className="stats" variants={stagger(0.08)} initial="hidden" animate="show">
            <motion.div variants={rise} className="stat">
              <span>คะแนนโหวตทั้งหมด</span>
              <b>{fmt(stats.totalVotes)}</b>
            </motion.div>
            <motion.div variants={rise} className="stat">
              <span>ผู้ร่วมโหวต</span>
              <b>{fmt(stats.voters)}</b>
            </motion.div>
            <motion.div variants={rise} className="stat stat-accent">
              <span>นำอยู่ตอนนี้</span>
              <b className="stat-title">{ranked[0]?.title ?? '-'}</b>
            </motion.div>
          </motion.div>

          <motion.ol className="rank" variants={stagger(0.05, 0.2)} initial="hidden" animate="show">
            {ranked.map((e, i) => {
              const share = stats.totalVotes ? Math.round((e.votes / stats.totalVotes) * 100) : 0
              return (
                <motion.li key={e.id} variants={rise} layout className="rank-row">
                  <span className="rank-no">{i + 1}</span>
                  <img src={e.image} alt="" className="rank-thumb" loading="lazy" />
                  <div className="rank-body">
                    <div className="rank-top">
                      <b>{e.title}</b>
                      <span>
                        {fmt(e.votes)} · {share}%
                      </span>
                    </div>
                    <span className="rank-author">{e.author}</span>
                    <span className="rank-bar">
                      <motion.i
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: e.votes / max }}
                        transition={{ duration: 0.9, delay: 0.25 + i * 0.04, ease: easeOut }}
                      />
                    </span>
                  </div>
                </motion.li>
              )
            })}
          </motion.ol>
        </>
      )}
    </motion.main>
  )
}
