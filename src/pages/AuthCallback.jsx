import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Logo3D from '../components/Logo3D.jsx'
import Button from '../components/Button.jsx'
import { readLineCallback } from '../lib/lineAuth.js'
import { navigate } from '../lib/router.js'
import { page, shake } from '../lib/motion.js'
import { useSession } from '../state/session.jsx'

export default function AuthCallback() {
  const { completeLogin } = useSession()
  const [error, setError] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const result = readLineCallback()
    history.replaceState({}, '', '/auth/callback')
    if (result.error) {
      setError(result.error)
      return
    }
    completeLogin(result.payload)
      .then(() => navigate(result.returnTo, { replace: true }))
      .catch((err) => setError(err.message || 'ยืนยันตัวตนกับ LINE ไม่สำเร็จ'))
  }, [completeLogin])

  return (
    <motion.main {...page} className="page callback-page">
      <Logo3D size={110} interactive={false} delay={0} />
      {error ? (
        <motion.div className="callback-msg" animate={shake}>
          <h2>เข้าสู่ระบบไม่สำเร็จ</h2>
          <p role="alert">{error}</p>
          <Button onClick={() => navigate('/login', { replace: true })}>ลองอีกครั้ง</Button>
        </motion.div>
      ) : (
        <div className="callback-msg" role="status">
          <h2>กำลังยืนยันตัวตนกับ LINE</h2>
          <p>รอสักครู่…</p>
        </div>
      )}
    </motion.main>
  )
}
