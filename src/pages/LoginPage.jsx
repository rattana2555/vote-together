import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Logo3D from '../components/Logo3D.jsx'
import AmbientScene from '../components/AmbientScene.jsx'
import Button, { LineIcon } from '../components/Button.jsx'
import Avatar from '../components/Avatar.jsx'
import LinkPrompt from '../components/LinkPrompt.jsx'
import { APP, isLoginConfigured } from '../config.js'
import { navigate } from '../lib/router.js'
import { page, rise, shake, stagger } from '../lib/motion.js'
import { useSession } from '../state/session.jsx'

export default function LoginPage() {
  const { user, login, loginError, pendingLink } = useSession()
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

        {!user && pendingLink ? (
          <LinkPrompt />
        ) : user ? (
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
