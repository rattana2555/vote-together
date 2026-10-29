import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../../components/Button.jsx'
import ConfirmBox from '../../components/ConfirmBox.jsx'
import DriveImg from '../../components/DriveImg.jsx'
import { api } from '../../lib/api.js'
import { primeImage, setImageScope } from '../../lib/images.js'
import { resizeImage } from '../../lib/resize.js'
import { rise, shake, spring, stagger } from '../../lib/motion.js'

// <input type="datetime-local"> works in local time; the backend stores an ISO string.
const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : '')

let pendingSeq = 0

function EntryManager({ campaignId, entries, setEntries }) {
  const [employees, setEmployees] = useState([])
  const [pending, setPending] = useState([])
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    api.employees().then(setEmployees, () => {})
  }, [])

  useEffect(
    () => () => pending.forEach((p) => URL.revokeObjectURL(p.preview)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const pick = (files) => {
    const added = [...files]
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        key: ++pendingSeq,
        file,
        preview: URL.createObjectURL(file),
        title: file.name.replace(/\.[^.]+$/, ''),
        author: '',
        state: 'idle',
        error: '',
      }))
    setPending((p) => [...p, ...added])
  }

  const patch = (key, change) => setPending((list) => list.map((p) => (p.key === key ? { ...p, ...change } : p)))

  const uploadAll = async () => {
    setUploading(true)
    for (const item of pending) {
      if (item.state === 'done') continue
      if (!item.title.trim() || !item.author.trim()) {
        patch(item.key, { state: 'error', error: 'ใส่ชื่อผลงานและเจ้าของผลงานก่อน' })
        continue
      }
      patch(item.key, { state: 'uploading', error: '' })
      try {
        const img = await resizeImage(item.file)
        const entry = await api.addEntry({
          campaignId,
          title: item.title,
          author: item.author,
          image: img.dataUrl,
          width: img.width,
          height: img.height,
        })
        primeImage(entry.imageId, img.dataUrl)
        setEntries((list) => [...list, entry])
        URL.revokeObjectURL(item.preview)
        setPending((list) => list.filter((p) => p.key !== item.key))
      } catch (err) {
        patch(item.key, { state: 'error', error: err.message })
      }
    }
    setUploading(false)
  }

  const remove = async () => {
    setRemoveBusy(true)
    try {
      await api.deleteEntry(campaignId, removing.id)
      setEntries((list) => list.filter((e) => e.id !== removing.id))
      setRemoving(null)
    } catch (err) {
      setError(err.message)
      setRemoving(null)
    } finally {
      setRemoveBusy(false)
    }
  }

  return (
    <section className="entry-manager">
      <div className="settings-head">
        <h3>ผลงานในกิจกรรมนี้ ({entries.length})</h3>
        <p>เลือกรูปได้ทีละหลายรูป ระบบย่อรูปให้อัตโนมัติก่อนอัปโหลด</p>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {entries.length > 0 && (
        <motion.div className="entry-grid" variants={stagger(0.04)} initial="hidden" animate="show">
          {entries.map((e) => (
            <motion.div key={e.id} variants={rise} className="entry-tile">
              <div className="entry-thumb">
                <DriveImg id={e.imageId} alt={e.title} />
              </div>
              <b title={e.title}>{e.title}</b>
              <span title={e.author}>{e.author}</span>
              <div className="entry-foot">
                <span>{e.votes || 0} โหวต</span>
                <button type="button" className="link-danger" onClick={() => setRemoving(e)} disabled={e.votes > 0} title={e.votes > 0 ? 'มีคนโหวตแล้ว ลบไม่ได้' : 'ลบผลงาน'}>
                  ลบ
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <label
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          pick(e.dataTransfer.files)
        }}
      >
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => (pick(e.target.files), (e.target.value = ''))} />
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 16V4M7 9l5-5 5 5" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <b>เพิ่มรูปผลงาน</b>
        <span>แตะเพื่อเลือกรูป หรือลากไฟล์มาวาง</span>
      </label>

      <datalist id="employee-names">
        {employees.map((e) => (
          <option key={e.empId} value={e.display} />
        ))}
      </datalist>

      <AnimatePresence initial={false}>
        {pending.map((p) => (
          <motion.div
            key={p.key}
            className={`pending-row${p.state === 'error' ? ' is-error' : ''}`}
            initial={{ opacity: 0, y: 12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto', ...(p.state === 'error' ? shake : {}) }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={spring}
          >
            <img src={p.preview} alt="" className="pending-thumb" />
            <div className="pending-fields">
              <label className="field">
                <span>ชื่อผลงาน</span>
                <input value={p.title} onChange={(e) => patch(p.key, { title: e.target.value })} disabled={p.state === 'uploading'} />
              </label>
              <label className="field">
                <span>เจ้าของผลงาน (พิมพ์ค้นชื่อพนักงานได้)</span>
                <input
                  list="employee-names"
                  value={p.author}
                  onChange={(e) => patch(p.key, { author: e.target.value })}
                  placeholder="ชื่อจริง (ชื่อเล่น)"
                  disabled={p.state === 'uploading'}
                />
              </label>
              {p.error && <p className="form-error">{p.error}</p>}
            </div>
            <div className="pending-side">
              {p.state === 'uploading' ? (
                <span className="spinner" aria-label="กำลังอัปโหลด" />
              ) : (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="เอารูปนี้ออก"
                  onClick={() => {
                    URL.revokeObjectURL(p.preview)
                    setPending((list) => list.filter((x) => x.key !== p.key))
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {pending.length > 0 && (
        <div className="settings-actions">
          <Button onClick={uploadAll} disabled={uploading}>
            {uploading ? (
              <>
                <span className="spinner" aria-hidden="true" /> กำลังอัปโหลด…
              </>
            ) : (
              `อัปโหลด ${pending.length} รูป`
            )}
          </Button>
        </div>
      )}

      <AnimatePresence>
        {removing && (
          <ConfirmBox
            key="remove"
            title={`ลบ “${removing.title}”?`}
            confirmLabel="ลบผลงาน"
            danger
            busy={removeBusy}
            onConfirm={remove}
            onCancel={() => setRemoving(null)}
          >
            <p>รูปจะถูกย้ายไปถังขยะใน Google Drive กู้คืนได้ภายใน 30 วัน</p>
          </ConfirmBox>
        )}
      </AnimatePresence>
    </section>
  )
}

export default function CampaignEditor({ initial, onBack, onSaved }) {
  const isNew = !initial.id
  const [form, setForm] = useState(() => ({
    title: initial.title || '',
    subtitle: initial.subtitle || '',
    endsAt: toLocalInput(initial.endsAt),
    showCounts: Boolean(initial.showCounts),
    source: initial.source || 'app',
    sheetUrl: initial.sheetUrl || '',
  }))
  const [entries, setEntries] = useState([])
  const [detected, setDetected] = useState(null)
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [errKey, setErrKey] = useState(0)

  useEffect(() => {
    if (!initial.id) return
    setImageScope(initial.id)
    api
      .campaignEntries(initial.id)
      .then((d) => {
        setEntries(d.entries)
        setDetected(d.detected)
      })
      .catch((err) => setError(err.message))
  }, [initial.id])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setState('saving')
    setError('')
    try {
      const d = await api.saveCampaign({ ...form, id: initial.id, endsAt: fromLocalInput(form.endsAt) })
      setDetected(d.detected)
      setState('saved')
      onSaved({ ...d.campaign, active: initial.active })
    } catch (err) {
      setState('idle')
      setError(err.message)
      setErrKey((k) => k + 1)
    }
  }

  return (
    <motion.div className="admin-panel" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={spring}>
      <button type="button" className="back-link" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        กลับไปรายการกิจกรรม
      </button>

      <form className="settings" onSubmit={save}>
        <div className="settings-head">
          <h3>{isNew ? 'สร้างกิจกรรมโหวตใหม่' : 'แก้ไขกิจกรรม'}</h3>
          {initial.active && <span className="tag tag-live">กำลังใช้งาน</span>}
        </div>

        <div className="field field-wide">
          <span className="field-label">ผลงานมาจากไหน</span>
          <div className="segmented" role="radiogroup">
            {[
              ['app', 'อัปโหลดรูปในแอป'],
              ['sheet', 'ดึงจาก Google Sheet (Form)'],
            ].map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={form.source === v}
                className={form.source === v ? 'is-on' : ''}
                onClick={() => setForm((f) => ({ ...f, source: v }))}
              >
                {form.source === v && <motion.span layoutId="seg-pill" className="seg-pill" transition={spring} />}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>ชื่อกิจกรรม</span>
          <input required value={form.title} onChange={set('title')} placeholder="เช่น ประกวดภาพปีใหม่ 2027" />
        </label>
        <label className="field">
          <span>ปิดโหวต (เว้นว่าง = ยังไม่กำหนด)</span>
          <input type="datetime-local" value={form.endsAt} onChange={set('endsAt')} />
        </label>
        <label className="field field-wide">
          <span>คำโปรย</span>
          <input value={form.subtitle} onChange={set('subtitle')} placeholder="เช่น โหวตภาพที่ชอบที่สุด เลือกได้ 1 ภาพ" />
        </label>
        {form.source === 'sheet' && (
          <label className="field field-wide">
            <span>ลิงก์ชีทคำตอบ</span>
            <input type="url" required value={form.sheetUrl} onChange={set('sheetUrl')} placeholder="https://docs.google.com/spreadsheets/d/…" />
          </label>
        )}
        <label className="check">
          <input type="checkbox" checked={form.showCounts} onChange={set('showCounts')} />
          <span>ให้ผู้โหวตเห็นคะแนนของแต่ละผลงาน</span>
        </label>

        {form.source === 'sheet' && detected && (
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
                <span className="spinner" aria-hidden="true" /> กำลังบันทึก…
              </>
            ) : isNew ? (
              'สร้างกิจกรรม'
            ) : (
              'บันทึก'
            )}
          </Button>
        </div>
      </form>

      {!isNew && initial.source === 'app' && form.source === 'app' && (
        <EntryManager campaignId={initial.id} entries={entries} setEntries={setEntries} />
      )}
      {isNew && form.source === 'app' && <p className="hint">กด “สร้างกิจกรรม” ก่อน แล้วจะเพิ่มรูปผลงานได้ทันที</p>}
    </motion.div>
  )
}
