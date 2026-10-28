import { useState } from 'react'
import { motion } from 'framer-motion'
import Logo3D from '../components/Logo3D.jsx'
import AmbientScene from '../components/AmbientScene.jsx'
import Button, { LineIcon } from '../components/Button.jsx'
import Avatar from '../components/Avatar.jsx'
import { APP, isLoginConfigured } from '../config.js'
import { navigate } from '../lib/router.js'
import { page, rise, stagger } from '../lib/motion.js'
import { useSession } from '../state/session.jsx'

export default function LoginPage() {
  const { user, login } = useSession()
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState('')
  const configured = isLoginConfigured()

  const start = async () => {
    setError('')
    setRedirecting(true)
    try {
      await login('/')
    } catch {
      setRedirecting(false)
      setError('เปิดหน้าเข้าสู่ระบบ LINE ไม่ได้ กรุณาลองอีกครั้ง')
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
          {APP.taglineTh}
        </motion.p>

        {user ? (
          <motion.div variants={rise} className="login-signed">
            <Avatar user={user} size={44} />
            <div>
              <b>{user.name}</b>
              <span>เข้าสู่ระบบแล้ว</span>
            </div>
            <Button size="sm" onClick={() => navigate('/')}>
              ไปที่ผลงาน
            </Button>
          </motion.div>
        ) : (
          <motion.div variants={rise} className="login-actions">
            <Button variant="line" size="lg" className="btn-block" onClick={start} disabled={!configured || redirecting}>
              {redirecting ? <span className="spinner" aria-hidden="true" /> : <LineIcon size={24} />}
              {redirecting ? 'กำลังพาไปที่ LINE…' : 'เข้าสู่ระบบด้วย LINE'}
            </Button>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {!configured && (
              <p className="form-error" role="alert">
                ยังไม่ได้ตั้งค่า LINE Login (VITE_LINE_CHANNEL_ID / VITE_API_BASE)
              </p>
            )}
            <p className="login-fine">
              เราใช้ชื่อและรูปโปรไฟล์ LINE เพื่อยืนยันสิทธิ์ 1 บัญชีต่อ 1 โหวตเท่านั้น
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.main>
  )
}
