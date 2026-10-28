import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../components/Button.jsx'
import DriveImg from '../components/DriveImg.jsx'
import { api } from '../lib/api.js'
import { navigate } from '../lib/router.js'
import { easeOut, page, rise, shake, stagger } from '../lib/motion.js'
import { useSession } from '../state/session.jsx'

const REFRESH_MS = 20000
const fmt = (n) => n.toLocaleString('th-TH')

// <input type="datetime-local"> works in local time; the backend stores an ISO string with +07:00.
const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : '')

function EventSettings({ onSaved }) {
  const [form, setForm] = useState(null)
  const [detected, setDetected] = useState(null)
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [errKey, setErrKey] = useState(0)

  useEffect(() => {
    api
      .getConfig()
      .then((d) => {
        setForm({ ...d.config, endsAt: toLocalInput(d.config.endsAt) })
        setDetected(d.detected)
      })
      .catch((err) => setError(err.message))
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setState('saving')
    setError('')
    try {
      const d = await api.saveConfig({ ...form, endsAt: fromLocalInput(form.endsAt) })
      setDetected(d.detected)
      setState('saved')
      onSaved()
    } catch (err) {
      setState('idle')
      setError(err.message)
      setErrKey((k) => k + 1)
    }
  }

  if (!form) {
    return error ? <p className="form-error">{error}</p> : <div className="settings shimmer" style={{ height: 220 }} />
  }

  return (
    <form className="settings" onSubmit={save}>
      <div className="settings-head">
        <h3>ตั้งค่ากิจกรรม</h3>
        <p>วางลิงก์ชีทคำตอบ (Google Form) ของกิจกรรมใหม่ แอปจะดึงรูปและชื่อมาเอง คะแนนแยกเก็บในแท็บ VOTE_TOGETHER_VOTES ของชีทนั้น</p>
      </div>
      <label className="field field-wide">
        <span>ลิงก์ชีทผลงาน</span>
        <input type="url" required value={form.sheetUrl} onChange={set('sheetUrl')} placeholder="https://docs.google.com/spreadsheets/d/…" />
      </label>
      <label className="field">
        <span>ชื่อกิจกรรม</span>
        <input required value={form.title} onChange={set('title')} />
      </label>
      <label className="field">
        <span>ปิดโหวต (เว้นว่าง = ยังไม่กำหนด)</span>
        <input type="datetime-local" value={form.endsAt} onChange={set('endsAt')} />
      </label>
      <label className="field field-wide">
        <span>คำโปรย</span>
        <input value={form.subtitle} onChange={set('subtitle')} />
      </label>
      <label className="check">
        <input type="checkbox" checked={form.showCounts} onChange={set('showCounts')} />
        <span>ให้ผู้โหวตเห็นคะแนนของแต่ละผลงาน</span>
      </label>

      {detected && (
        <div className="detected">
          <b>
            เชื่อมกับ “{detected.spreadsheet}” · แท็บ {detected.tab} · พบ {detected.entryCount} ผลงาน
          </b>
          <span>
            ชื่อภาพ: {detected.columns.title || '—'} · ชื่อ: {detected.columns.fullName || '—'} · ชื่อเล่น: {detected.columns.nick || '—'} · รูป:{' '}
            {detected.columns.image || '—'}
          </span>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.p key={errKey} className="form-error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1, ...shake }} exit={{ opacity: 0 }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="settings-actions">
        {state === 'saved' && <span className="pill pill-success">บันทึกแล้ว</span>}
        <Button type="submit" disabled={state === 'saving'}>
          {state === 'saving' ? (
            <>
              <span className="spinner" aria-hidden="true" /> กำลังตรวจชีท…
            </>
          ) : (
            'บันทึกและเชื่อมชีท'
          )}
        </Button>
      </div>
    </form>
  )
}

export default function AdminPage() {
  const { user, ready } = useSession()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      setStats(await api.stats())
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
          <p>หน้านี้สำหรับผู้ดูแลกิจกรรมเท่านั้น</p>
          <Button variant="ghost" onClick={() => navigate(user ? '/' : '/login')}>
            {user ? 'กลับไปหน้าผลงาน' : 'เข้าสู่ระบบ'}
          </Button>
        </div>
      </motion.main>
    )
  }

  const ranked = stats ? [...stats.entries].sort((a, b) => b.votes - a.votes) : []
  const max = ranked[0]?.votes || 1
  const turnout = stats?.eligible ? Math.round((stats.voters / stats.eligible) * 100) : 0

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
              ? `อัปเดตล่าสุด ${new Date(stats.updatedAt).toLocaleTimeString('th-TH')} · รีเฟรชอัตโนมัติทุก 20 วินาที`
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
        </>
      )}

      <EventSettings onSaved={load} />
    </motion.main>
  )
}
