import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../../components/Button.jsx'
import { api } from '../../lib/api.js'
import { shake } from '../../lib/motion.js'

export default function LineHrSettings() {
  const [cfg, setCfg] = useState(null)
  const [form, setForm] = useState({ webhookUrl: '', oaId: '' })
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [errKey, setErrKey] = useState(0)

  useEffect(() => {
    api.getLineHr().then(
      (c) => {
        setCfg(c)
        setForm({ webhookUrl: c.webhookUrl, oaId: c.oaId })
      },
      (err) => setError(err.message),
    )
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      setCfg(await api.saveLineHr(form))
      setSaved(true)
    } catch (err) {
      setError(err.message)
      setErrKey((k) => k + 1)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cfg.receiverUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked: the URL is on screen */
    }
  }

  return (
    <form className="settings" onSubmit={save}>
      <div className="settings-head">
        <h3>เชื่อมกับ LINE HR (ใช้ userId จริง)</h3>
        <p>
          พนักงานที่เข้าครั้งแรกจะได้รหัส VT-xxxxxx ไปส่งในแชท LINE HR ระบบอ่าน userId จริงจากข้อความนั้น ส่วนข้อความอื่นทั้งหมดส่งต่อให้บอท HR
          ตัวเดิมตามปกติ
        </p>
      </div>
      {cfg && (
        <span className={`tag ${cfg.enabled ? 'tag-live' : ''}`} style={{ width: 'fit-content' }}>
          {cfg.enabled ? 'เปิดใช้อยู่' : 'ยังไม่เปิดใช้'}
        </span>
      )}

      <label className="field field-wide">
        <span>1. Webhook เดิมของบอท LINE HR (คัดลอกจาก OA Manager ก่อนเปลี่ยน)</span>
        <input
          type="url"
          value={form.webhookUrl}
          onChange={(e) => setForm((f) => ({ ...f, webhookUrl: e.target.value }))}
          placeholder="https://script.google.com/macros/s/…/exec"
        />
      </label>
      <label className="field">
        <span>2. LINE ID ของ LINE HR</span>
        <input value={form.oaId} onChange={(e) => setForm((f) => ({ ...f, oaId: e.target.value }))} placeholder="@123abcde" />
      </label>

      {cfg?.receiverUrl && (
        <div className="detected">
          <b>3. แล้วเปลี่ยน “ลิงก์ Webhook” ของ LINE HR เป็น URL นี้</b>
          <span className="mono">{cfg.receiverUrl}</span>
          <button type="button" className="back-link" onClick={copy}>
            {copied ? 'คัดลอกแล้ว' : 'คัดลอก URL'}
          </button>
          <span>
            OA Manager → LINE HR → ตั้งค่า → Messaging API → ลิงก์ Webhook → บันทึก · ถ้ามีปัญหา เปลี่ยนกลับเป็น Webhook เดิมในข้อ 1 ได้ทันที
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
        {saved && <span className="pill pill-success">บันทึกแล้ว</span>}
        <Button type="submit" disabled={busy || !cfg}>
          {busy ? <span className="spinner" aria-hidden="true" /> : null} บันทึก
        </Button>
      </div>
    </form>
  )
}
