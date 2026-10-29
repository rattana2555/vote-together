import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../../components/Button.jsx'
import { api } from '../../lib/api.js'
import { shake } from '../../lib/motion.js'

// Where the "register with LINE HR" button points for people who can't log in yet.
export default function LineHrLink() {
  const [value, setValue] = useState(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [errKey, setErrKey] = useState(0)

  useEffect(() => {
    api.getLineHrLink().then(
      (d) => {
        setValue(d.value)
        setUrl(d.url)
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
      const d = await api.saveLineHrLink(value)
      setValue(d.value)
      setUrl(d.url)
      setSaved(true)
    } catch (err) {
      setError(err.message)
      setErrKey((k) => k + 1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="settings" onSubmit={save}>
      <div className="settings-head">
        <h3>ลิงก์ LINE HR สำหรับคนที่ยังไม่ลงทะเบียน</h3>
        <p>คนที่ login แล้วไม่พบในรายชื่อพนักงาน จะเห็นปุ่ม “ไปลงทะเบียนที่ LINE HR” ที่เปิดลิงก์นี้ (เป็นแค่ลิงก์เปิดแชท ไม่แตะตั้งค่าใด ๆ ของ LINE HR)</p>
      </div>
      <label className="field field-wide">
        <span>LINE ID ของ LINE HR (เช่น @123abcde) หรือลิงก์ lin.ee / line.me</span>
        <input value={value ?? ''} onChange={(e) => setValue(e.target.value)} placeholder="@123abcde" disabled={value === null} />
      </label>
      {url && (
        <a className="back-link" href={url} target="_blank" rel="noopener noreferrer">
          ทดลองเปิดลิงก์ →
        </a>
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
        <Button type="submit" disabled={busy || value === null}>
          {busy ? <span className="spinner" aria-hidden="true" /> : null} บันทึก
        </Button>
      </div>
    </form>
  )
}
