import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Button from '../../components/Button.jsx'
import DriveImg from '../../components/DriveImg.jsx'
import { api } from '../../lib/api.js'
import { setImageScope } from '../../lib/images.js'
import { easeOut, rise, stagger } from '../../lib/motion.js'

const REFRESH_MS = 20000
const fmt = (n) => n.toLocaleString('th-TH')

export default function Results({ campaigns }) {
  const active = campaigns?.find((c) => c.active)
  const [campaignId, setCampaignId] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = campaignId || active?.id

  const load = useCallback(async () => {
    if (!selected) return
    setBusy(true)
    try {
      setImageScope(selected)
      setStats(await api.stats(selected))
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }, [selected])

  useEffect(() => {
    setStats(null)
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  const ranked = stats ? [...stats.entries].sort((a, b) => b.votes - a.votes) : []
  const max = ranked[0]?.votes || 1
  const turnout = stats?.eligible ? Math.round((stats.voters / stats.eligible) * 100) : 0

  return (
    <div className="admin-panel">
      {campaigns && campaigns.length > 1 && (
        <div className="chip-row" role="tablist" aria-label="เลือกกิจกรรม">
          {campaigns.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === selected}
              className={`chip${c.id === selected ? ' is-on' : ''}`}
              onClick={() => setCampaignId(c.id)}
              title={c.title}
            >
              {c.active && <span className="dot-live" aria-hidden="true" />}
              {c.title}
            </button>
          ))}
        </div>
      )}

      <div className="panel-head">
        <p>
          {stats
            ? `${stats.campaign.title} · อัปเดต ${new Date(stats.updatedAt).toLocaleTimeString('th-TH')} · รีเฟรชเองทุก 20 วินาที`
            : 'กำลังโหลดข้อมูล…'}
        </p>
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
              <span>
                ผู้ร่วมโหวต · {turnout}% ของ {fmt(stats.eligible)} คน
              </span>
              <b>{fmt(stats.voters)}</b>
            </motion.div>
            <motion.div variants={rise} className="stat stat-accent">
              <span>นำอยู่ตอนนี้</span>
              <b className="stat-title" title={ranked[0]?.title}>
                {ranked[0]?.votes ? ranked[0].title : '—'}
              </b>
            </motion.div>
          </motion.div>

          {ranked.length === 0 ? (
            <div className="empty" style={{ marginTop: 20 }}>
              <p>กิจกรรมนี้ยังไม่มีผลงาน</p>
            </div>
          ) : (
            <motion.ol className="rank" variants={stagger(0.05, 0.2)} initial="hidden" animate="show">
              {ranked.map((e, i) => {
                const share = stats.totalVotes ? Math.round((e.votes / stats.totalVotes) * 100) : 0
                return (
                  <motion.li key={e.id} variants={rise} layout className="rank-row">
                    <span className="rank-no">{i + 1}</span>
                    <DriveImg id={e.imageId} alt="" className="rank-thumb" />
                    <div className="rank-body">
                      <div className="rank-top">
                        <b title={e.title}>{e.title}</b>
                        <span>
                          {fmt(e.votes)} · {share}%
                        </span>
                      </div>
                      <span className="rank-author" title={e.author}>
                        {e.author}
                      </span>
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
          )}
        </>
      )}
    </div>
  )
}
