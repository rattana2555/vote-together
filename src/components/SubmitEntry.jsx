import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from './Button.jsx'
import ConfirmBox from './ConfirmBox.jsx'
import DriveImg from './DriveImg.jsx'
import { api } from '../lib/api.js'
import { primeImage } from '../lib/images.js'
import { resizeImage } from '../lib/resize.js'
import { shake, spring } from '../lib/motion.js'

// Employees enter their own photo (one per person). Owner name comes from their login.
export default function SubmitEntry({ campaign, user, myEntry, onSubmitted, onRemoved }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [title, setTitle] = useState('')
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [errKey, setErrKey] = useState(0)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const pickRef = useRef(null)

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const pick = (f) => {
    if (!f || !f.type.startsWith('image/')) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError('')
  }

  const send = async (e) => {
    e.preventDefault()
    if (!file) return pickRef.current?.click()
    setState('sending')
    setError('')
    try {
      const img = await resizeImage(file)
      const entry = await api.submitEntry(campaign.id, { title: title.trim(), image: img.dataUrl, width: img.width, height: img.height })
      primeImage(entry.imageId, img.dataUrl)
      setState('idle')
      setOpen(false)
      setFile(null)
      setPreview('')
      setTitle('')
      onSubmitted(entry)
    } catch (err) {
      setState('idle')
      setError(err.message)
      setErrKey((k) => k + 1)
    }
  }

  const remove = async () => {
    setState('removing')
    try {
      await api.deleteMyEntry(campaign.id, myEntry.id)
      setConfirmRemove(false)
      onRemoved(myEntry.id)
    } catch (err) {
      setError(err.message)
      setConfirmRemove(false)
    } finally {
      setState('idle')
    }
  }

  if (myEntry) {
    return (
      <div className="submit-panel is-done">
        <div className="submit-mine">
          <span className="submit-thumb">
            <DriveImg id={myEntry.imageId} alt="" eager />
          </span>
          <div>
            <b>ผลงานของคุณ: {myEntry.title}</b>
            <span>ส่งเข้ากิจกรรมแล้ว · เพื่อน ๆ โหวตให้ได้เลย</span>
            {error && <span className="form-error">{error}</span>}
          </div>
        </div>
        {!campaign.closed && (
          <button type="button" className="link-danger" onClick={() => setConfirmRemove(true)}>
            ลบเพื่อส่งใหม่
          </button>
        )}
        <AnimatePresence>
          {confirmRemove && (
            <ConfirmBox
              key="rm"
              title="ลบผลงานของคุณ?"
              confirmLabel="ลบผลงาน"
              danger
              busy={state === 'removing'}
              onConfirm={remove}
              onCancel={() => setConfirmRemove(false)}
            >
              <p>ลบได้เฉพาะตอนที่ยังไม่มีใครโหวตให้ ลบแล้วส่งรูปใหม่ได้ทันที</p>
            </ConfirmBox>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="submit-panel">
      {!open ? (
        <div className="submit-cta">
          <div>
            <b>ส่งผลงานของคุณเข้าประกวด</b>
            <span>คนละ 1 ภาพ ชื่อเจ้าของผลงานใส่ให้อัตโนมัติเป็น {user.display}</span>
          </div>
          <Button onClick={() => setOpen(true)}>+ ส่งผลงาน</Button>
        </div>
      ) : (
        <motion.form className="submit-form" onSubmit={send} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <button type="button" className={`submit-drop${preview ? ' has-img' : ''}`} onClick={() => pickRef.current?.click()}>
            {preview ? (
              <img src={preview} alt="" />
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 16V4M7 9l5-5 5 5" />
                  <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </svg>
                <b>เลือกรูปผลงาน</b>
                <span>แตะเพื่อถ่ายหรือเลือกจากคลังรูป</span>
              </>
            )}
          </button>
          <input ref={pickRef} type="file" accept="image/*" hidden onChange={(e) => (pick(e.target.files[0]), (e.target.value = ''))} />
          <div className="submit-fields">
            <label className="field">
              <span>ชื่อภาพ / สโลแกน / แคปชั่น</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="ตั้งชื่อผลงานของคุณ" required />
            </label>
            <p className="submit-owner">เจ้าของผลงาน: {user.display}</p>
            <AnimatePresence>
              {error && (
                <motion.p key={errKey} className="form-error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1, ...shake }} exit={{ opacity: 0 }}>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="submit-actions">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={state === 'sending'}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={state === 'sending' || !file || !title.trim()}>
                {state === 'sending' ? (
                  <>
                    <span className="spinner" aria-hidden="true" /> กำลังส่ง…
                  </>
                ) : (
                  'ส่งผลงาน'
                )}
              </Button>
            </div>
          </div>
        </motion.form>
      )}
    </div>
  )
}
