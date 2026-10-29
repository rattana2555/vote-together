import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../../components/Button.jsx'
import ConfirmBox from '../../components/ConfirmBox.jsx'
import CampaignEditor from './CampaignEditor.jsx'
import { api } from '../../lib/api.js'
import { linkProps } from '../../lib/router.js'
import { rise, stagger } from '../../lib/motion.js'

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'ยังไม่กำหนด'

export const SOURCE_NAME = { app: 'โหวตภาพ · อัปโหลดในแอป', sheet: 'โหวตภาพ · Google Sheet', form: 'แบบสอบถาม / โพล' }

let editorSeq = 0

export default function Campaigns({ campaigns, reload }) {
  const [editing, setEditing] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const remove = async () => {
    setDeleteBusy(true)
    setError('')
    try {
      await api.deleteCampaign(deleting.id)
      setDeleting(null)
      await reload()
    } catch (err) {
      setError(err.message)
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  const togglePublish = async (c) => {
    setBusyId(c.id)
    setError('')
    try {
      await api.setPublished(c.id, !c.published)
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
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
        <p>แสดงในหน้าโหวตได้พร้อมกันหลายกิจกรรม กิจกรรมใหม่จะซ่อนไว้ก่อนจนกว่าจะกด “แสดงในหน้าโหวต”</p>
        <Button size="sm" onClick={() => setEditing({ source: 'form', showCounts: false, _key: ++editorSeq })}>
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
            <motion.article key={c.id} variants={rise} className={`campaign-card${c.published ? ' is-active' : ''}`}>
              <div className="campaign-top">
                <h3 title={c.title}>{c.title}</h3>
                <div className="badges">
                  {c.published ? <span className="tag tag-live">แสดงอยู่</span> : <span className="tag">ซ่อนอยู่</span>}
                  {c.closed && <span className="tag">ปิดโหวตแล้ว</span>}
                  <span className="tag tag-soft">{SOURCE_NAME[c.source]}</span>
                </div>
              </div>
              <p className="campaign-meta">
                ปิดโหวต {fmtDate(c.endsAt)} · สร้างโดย {c.createdBy || '—'}
              </p>
              <div className="campaign-actions">
                <Button variant="ghost" size="sm" onClick={() => setEditing({ ...c, _key: ++editorSeq })}>
                  {c.source === 'form' ? 'แก้ไข / คำถาม' : c.source === 'app' ? 'แก้ไข / ผลงาน' : 'แก้ไข'}
                </Button>
                <a {...linkProps(`/c/${c.id}`)} className="btn btn-ghost btn-sm">
                  <span className="btn-label">ดูหน้าโหวต</span>
                </a>
                <Button size="sm" variant={c.published ? 'ghost' : 'primary'} onClick={() => togglePublish(c)} disabled={busyId === c.id}>
                  {busyId === c.id ? <span className="spinner" aria-hidden="true" /> : null}
                  {c.published ? 'ซ่อน' : 'แสดงในหน้าโหวต'}
                </Button>
                <button type="button" className="link-danger campaign-delete" onClick={() => setDeleting(c)}>
                  ลบ
                </button>
              </div>
            </motion.article>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {deleting && (
          <ConfirmBox
            key="delete"
            title={`ลบ “${deleting.title}”?`}
            confirmLabel="ลบกิจกรรม"
            danger
            busy={deleteBusy}
            onConfirm={remove}
            onCancel={() => setDeleting(null)}
          >
            <p>กิจกรรมจะหายจากแอปทันที ทั้งหน้าโหวตและแดชบอร์ด</p>
            <p>คะแนน คำตอบ และรูปยังเก็บอยู่ในชีท “VOTE TOGETHER Data” และ Google Drive ถ้าลบผิดแจ้งผู้ดูแลระบบให้กู้คืนได้</p>
          </ConfirmBox>
        )}
      </AnimatePresence>
    </div>
  )
}
