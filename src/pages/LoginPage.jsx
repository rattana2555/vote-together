import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Logo3D from '../components/Logo3D.jsx'
import AmbientScene from '../components/AmbientScene.jsx'
import Button, { LineIcon } from '../components/Button.jsx'
import Avatar from '../components/Avatar.jsx'
import { APP, isLoginConfigured } from '../config.js'
import { navigate } from '../lib/router.js'
import { page, rise, shake, stagger } from '../lib/motion.js'
import { api } from '../lib/api.js'
import { useSession } from '../state/session.jsx'

// Registered with LINE HR but not matched (e.g. changed LINE picture/name): ask an admin to confirm.
function AccessRequest({ info }) {
  const [empId, setEmpId] = useState('')
  const [state, setState] = useState(info.requested ? 'sent' : 'idle')
  const [error, setError] = useState('')

  const send = async (e) => {
    e.preventDefault()
    setState('sending')
    setError('')
    try {
      await api.requestAccess(info.requestToken, empId.trim())
      setState('sent')
    } catch (err) {
      setState('idle')
      setError(err.message)
    }
  }

  if (state === 'sent') {
    return (
      <motion.div className="access-sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <b>ส่งคำขอให้ผู้ดูแลแล้ว</b>
        <span>เมื่อผู้ดูแลยืนยัน กด “ลองเข้าสู่ระบบอีกครั้ง” ได้เลย (ยืนยันครั้งเดียว ใช้ได้ตลอด)</span>
      </motion.div>
    )
  }
  return (
    <form className="access-form" onSubmit={send}>
      <b>ลงทะเบียน LINE HR แล้ว แต่ยังเข้าไม่ได้?</b>
      <span>ใส่รหัสพนักงาน แล้วผู้ดูแลจะยืนยันว่าบัญชี LINE “{info.lineName}” เป็นของคุณ</span>
      <div className="access-row">
        <input value={empId} onChange={(e) => setEmpId(e.target.value)} placeholder="รหัสพนักงาน" inputMode="numeric" required />
        <Button type="submit" size="sm" disabled={state === 'sending' || !empId.trim()}>
          {state === 'sending' ? <span className="spinner" aria-hidden="true" /> : null} ส่งคำขอ
        </Button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  )
}

export default function LoginPage() {
  const { user, login, loginError, notRegistered } = useSession()
  const [busy, setBusy] = useState(false)
  const [tries, setTries] = useState(0)
  const configured = isLoginConfigured()

  const start = async () => {
    setBusy(true)
    try {
      await login('/', { fresh: tries > 0 })
    } catch {
      setTries((t) => t + 1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.main {...page} className="page login-page">
      <div className="login-scene" aria-hidden="true">
        <AmbientScene />
      </div>
      <motion.div className="login-card" variants={stagger(0.08, 0.15)} initial="hidden" animate="show">
        <motion.div variants={rise} className="login-logo">
          <Logo3D size={132} />
        </motion.div>
        <motion.h1 variants={rise} className="login-title">
          VOTE <span className="grad-text">TOGETHER</span>
        </motion.h1>
        <motion.p variants={rise} className="login-welcome">
          {APP.welcome}
        </motion.p>
        <motion.p variants={rise} className="login-sub">
          กิจกรรมโหวตภายในบริษัทรัตนไพบูลย์ สำหรับพนักงานที่ลงทะเบียน LINE กับบริษัทแล้ว
        </motion.p>

        {user ? (
          <motion.div variants={rise} className="login-signed">
            <Avatar user={user} size={44} />
            <div>
              <b title={user.display}>{user.display}</b>
              <span>เข้าสู่ระบบแล้ว</span>
            </div>
            <Button size="sm" onClick={() => navigate('/')}>
              ไปที่ผลงาน
            </Button>
          </motion.div>
        ) : notRegistered ? (
          <motion.div className="register-card" role="alert" initial={{ opacity: 0, y: 12, ...shake }} animate={{ opacity: 1, y: 0 }}>
            <span className="register-icon" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
                <path d="M19 3v4M17 5h4" />
              </svg>
            </span>
            <h2>ยังเข้าสู่ระบบไม่ได้</h2>
            <p>{loginError}</p>
            {notRegistered.requestToken && <AccessRequest info={notRegistered} />}
            <ol className="register-steps">
              <li>ถ้ายังไม่เคยลงทะเบียน: กดปุ่มด้านล่างเพื่อเปิดแชท LINE HR</li>
              <li>ลงทะเบียนพนักงานตามขั้นตอนของ LINE HR</li>
              <li>กลับมาที่หน้านี้ แล้วกด “ลองเข้าสู่ระบบอีกครั้ง”</li>
            </ol>
            {notRegistered.lineHrUrl ? (
              <a className="btn btn-line btn-lg btn-block" href={notRegistered.lineHrUrl} target="_blank" rel="noopener noreferrer">
                <span className="btn-label">
                  <LineIcon size={24} /> ไปลงทะเบียนที่ LINE HR
                </span>
              </a>
            ) : (
              <p className="login-fine">ติดต่อฝ่าย HR เพื่อขอลิงก์ลงทะเบียน LINE HR</p>
            )}
            <Button variant="ghost" className="btn-block" onClick={start} disabled={busy}>
              {busy ? <span className="spinner" aria-hidden="true" /> : null} ลองเข้าสู่ระบบอีกครั้ง
            </Button>
          </motion.div>
        ) : (
          <motion.div variants={rise} className="login-actions">
            <Button variant="line" size="lg" className="btn-block" onClick={start} disabled={!configured || busy}>
              {busy ? <span className="spinner" aria-hidden="true" /> : <LineIcon size={24} />}
              {busy ? 'กำลังเชื่อมต่อ LINE…' : 'เข้าสู่ระบบด้วย LINE'}
            </Button>
            <AnimatePresence>
              {loginError && (
                <motion.p
                  key={loginError + tries}
                  className="form-error"
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto', ...shake }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {loginError}
                </motion.p>
              )}
            </AnimatePresence>
            {!configured && (
              <p className="form-error" role="alert">
                ระบบเข้าสู่ระบบด้วย LINE กำลังจะเปิดเร็ว ๆ นี้
              </p>
            )}
            <p className="login-fine">ระบบตรวจรายชื่อจากบัญชี LINE ที่ลงทะเบียนพนักงานไว้ 1 บัญชีโหวตได้ 1 ครั้งต่อกิจกรรม</p>
          </motion.div>
        )}
      </motion.div>
    </motion.main>
  )
}
