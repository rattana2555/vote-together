import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../../components/Button.jsx'
import ConfirmBox from '../../components/ConfirmBox.jsx'
import CampaignEditor from './CampaignEditor.jsx'
import { api } from '../../lib/api.js'
import { rise, stagger } from '../../lib/motion.js'

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'ยังไม่กำหนด'

let editorSeq = 0

export default function Campaigns({ campaigns, reload }) {
  const [editing, setEditing] = useState(null)
  const [activating, setActivating] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const activate = async () => {
    setBusy(true)
    try {
      await api.activateCampaign(activating.id)
      setActivating(null)
      await reload()
    } catch (err) {
      setError(err.message)
      setActivating(null)
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <CampaignEditor
        key={editing._key}
        initial={editing}
        onBack={() => {
          setEditing(null)
          reload()
        }}
        onSaved={(c) => {
          setEditing((prev) => ({ ...c, _key: prev._key }))
          reload()
        }}
      />
    )
  }

  return (
    <div className="admin-panel">
      <div className="panel-head">
        <p>สร้างกิจกรรมใหม่ได้เรื่อย ๆ เปิดใช้ได้ทีละ 1 กิจกรรม ข้อมูลและคะแนนของกิจกรรมเก่ายังอยู่ครบ</p>
        <Button size="sm" onClick={() => setEditing({ source: 'app', showCounts: false, _key: ++editorSeq })}>
          + สร้างกิจกรรมใหม่
        </Button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!campaigns ? (
        <div className="campaign-list">
          {[0, 1].map((i) => (
            <div key={i} className="campaign-card shimmer" style={{ height: 120 }} />
          ))}
        </div>
      ) : (
        <motion.div className="campaign-list" variants={stagger(0.06)} initial="hidden" animate="show">
          {campaigns.map((c) => (
            <motion.article key={c.id} variants={rise} className={`campaign-card${c.active ? ' is-active' : ''}`}>
              <div className="campaign-top">
                <h3 title={c.title}>{c.title}</h3>
                <div className="badges">
                  {c.active && <span className="tag tag-live">กำลังใช้งาน</span>}
                  {c.closed && <span className="tag">ปิดโหวตแล้ว</span>}
                  <span className="tag tag-soft">{c.source === 'app' ? 'อัปโหลดในแอป' : 'Google Sheet'}</span>
                </div>
              </div>
              <p className="campaign-meta">
                ปิดโหวต {fmtDate(c.endsAt)} · สร้างโดย {c.createdBy || '—'}
              </p>
              <div className="campaign-actions">
                <Button variant="ghost" size="sm" onClick={() => setEditing({ ...c, _key: ++editorSeq })}>
                  {c.source === 'app' ? 'แก้ไข / จัดการผลงาน' : 'แก้ไข'}
                </Button>
                {!c.active && (
                  <Button size="sm" onClick={() => setActivating(c)}>
                    เปิดใช้กิจกรรมนี้
                  </Button>
                )}
              </div>
            </motion.article>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {activating && (
          <ConfirmBox
            key="activate"
            title={`เปิดใช้ “${activating.title}”?`}
            confirmLabel="เปิดใช้เลย"
            busy={busy}
            onConfirm={activate}
            onCancel={() => setActivating(null)}
          >
            <p>หน้าแรกของแอปจะเปลี่ยนเป็นกิจกรรมนี้ทันที กิจกรรมเดิมจะหยุดรับโหวต แต่ผลงานและคะแนนยังอยู่ครบ ดูย้อนหลังได้ที่แท็บผลโหวต</p>
          </ConfirmBox>
        )}
      </AnimatePresence>
    </div>
  )
}
