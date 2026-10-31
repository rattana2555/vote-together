import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../../components/Button.jsx'
import DriveImg from '../../components/DriveImg.jsx'
import { api } from '../../lib/api.js'
import { spring } from '../../lib/motion.js'

// People who registered with LINE HR but couldn't be matched automatically (changed LINE picture/name).
// The admin compares the LINE account with the employee record and approves once.
export default function AccessRequests({ onCount }) {
  const [list, setList] = useState(null)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [empIds, setEmpIds] = useState({})

  const load = useCallback(async () => {
    try {
      const r = await api.accessRequests()
      setList(r)
      onCount?.(r.length)
    } catch (err) {
      setError(err.message)
    }
  }, [onCount])

  useEffect(() => {
    load()
  }, [load])

  const resolve = async (req, approve) => {
    setBusy(req.sub)
    setError('')
    try {
      await api.resolveAccess(req.sub, approve, empIds[req.sub] ?? req.empId)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="admin-panel">
      <div className="panel-head">
        <p>คนที่ login ไม่ผ่าน (ระบบจับคู่กับรายชื่อ LINE HR ไม่ได้ เช่นเปลี่ยนรูปหรือชื่อ LINE) ตรวจรูปและชื่อให้ตรงกัน แล้วกดยืนยันครั้งเดียว</p>
        <Button variant="ghost" size="sm" onClick={load}>
          รีเฟรช
        </Button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!list ? (
        <div className="request-card shimmer" style={{ height: 120 }} />
      ) : !list.length ? (
        <div className="empty">
          <p>ไม่มีคำขอค้างอยู่</p>
        </div>
      ) : (
        <div className="request-list">
          <AnimatePresence initial={false}>
            {list.map((r) => (
              <motion.article key={r.sub} layout className="request-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} transition={spring}>
                <div className="request-compare">
                  <div className="request-side">
                    {r.picture ? <img src={r.picture} alt="" referrerPolicy="no-referrer" /> : <span className="ph" />}
                    <div>
                      <span>บัญชี LINE ที่ขอเข้า</span>
                      <b title={r.lineName}>{r.lineName}</b>
                      <span>
                        {r.status} · {r.requestedAt}
                      </span>
                    </div>
                  </div>
                  <span className="request-arrow" aria-hidden="true">
                    →
                  </span>
                  <div className="request-side">
                    {r.employee?.photoId ? <DriveImg id={r.employee.photoId} alt="" eager /> : <span className="ph" />}
                    <div>
                      <span>รหัสพนักงานที่แจ้ง: {r.empId || '—'}</span>
                      <b title={r.employee?.display}>{r.employee ? r.employee.display : r.empId ? 'ไม่พบในรายชื่อ LINE HR' : 'ยังไม่ได้แจ้งรหัส'}</b>
                      {r.employee && (
                        <span>
                          {r.employee.dept} · {r.employee.branch} · ชื่อใน LINE HR: {r.employee.lineName || '—'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="request-actions">
                  <input
                    value={empIds[r.sub] ?? r.empId}
                    onChange={(e) => setEmpIds((m) => ({ ...m, [r.sub]: e.target.value }))}
                    placeholder="รหัสพนักงาน"
                    aria-label="รหัสพนักงานที่จะผูก"
                  />
                  <Button size="sm" onClick={() => resolve(r, true)} disabled={busy === r.sub || !(empIds[r.sub] ?? r.empId)}>
                    {busy === r.sub ? <span className="spinner" aria-hidden="true" /> : null} ยืนยันว่าเป็นคนนี้
                  </Button>
                  <button type="button" className="link-danger" onClick={() => resolve(r, false)} disabled={busy === r.sub}>
                    ปฏิเสธ
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
