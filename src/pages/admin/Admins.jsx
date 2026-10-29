import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../../components/Button.jsx'
import { api } from '../../lib/api.js'
import { shake, spring } from '../../lib/motion.js'

export default function Admins({ me }) {
  const [admins, setAdmins] = useState(null)
  const [employees, setEmployees] = useState([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [errKey, setErrKey] = useState(0)

  useEffect(() => {
    api.admins().then(setAdmins, (err) => setError(err.message))
    api.employees().then(setEmployees, () => {})
  }, [])

  const save = async (ids) => {
    setBusy(true)
    setError('')
    try {
      setAdmins(await api.saveAdmins(ids))
      setQuery('')
    } catch (err) {
      setError(err.message)
      setErrKey((k) => k + 1)
    } finally {
      setBusy(false)
    }
  }

  const add = (e) => {
    e.preventDefault()
    const empId = (query.match(/^\s*(\S+)\s*·/) || query.match(/^\s*(\d+)\s*$/) || [])[1]
    if (!empId) {
      setError('เลือกพนักงานจากรายชื่อ หรือพิมพ์รหัสพนักงาน')
      setErrKey((k) => k + 1)
      return
    }
    save([...admins.map((a) => a.empId), empId])
  }

  return (
    <div className="admin-panel">
      <div className="panel-head">
        <p>ผู้ดูแลเข้าแดชบอร์ด สร้าง/เปิดใช้กิจกรรม และอัปโหลดผลงานได้ ต้องเป็นพนักงานที่ลงทะเบียน LINE HR แล้ว</p>
      </div>

      <div className="settings">
        {!admins ? (
          <div className="shimmer" style={{ height: 100 }} />
        ) : (
          <ul className="admin-list">
            <AnimatePresence initial={false}>
              {admins.map((a) => (
                <motion.li key={a.empId} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring}>
                  <span className="admin-id">{a.empId}</span>
                  <b title={a.display}>{a.display}</b>
                  {a.empId === me.empId ? (
                    <span className="tag tag-soft">คุณ</span>
                  ) : (
                    <button
                      type="button"
                      className="link-danger"
                      disabled={busy}
                      onClick={() => save(admins.filter((x) => x.empId !== a.empId).map((x) => x.empId))}
                    >
                      นำออก
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        <form className="admin-add" onSubmit={add}>
          <label className="field">
            <span>เพิ่มผู้ดูแล (พิมพ์ชื่อหรือรหัสพนักงาน)</span>
            <input list="admin-candidates" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="เช่น 65142 หรือ เจนจิรา" />
          </label>
          <datalist id="admin-candidates">
            {employees.map((e) => (
              <option key={e.empId} value={`${e.empId} · ${e.display}`} />
            ))}
          </datalist>
          <Button type="submit" disabled={busy || !admins}>
            {busy ? <span className="spinner" aria-hidden="true" /> : null} เพิ่ม
          </Button>
        </form>
        <AnimatePresence>
          {error && (
            <motion.p key={errKey} className="form-error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1, ...shake }} exit={{ opacity: 0 }}>
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
