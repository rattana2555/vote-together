import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Logo3D from './Logo3D.jsx'
import Avatar from './Avatar.jsx'
import { APP } from '../config.js'
import { MOCK_FAIL_KEY } from '../lib/api.js'
import { store } from '../lib/storage.js'
import { spring } from '../lib/motion.js'

export function LoadingScreen() {
  return (
    <motion.div className="loading-screen" exit={{ opacity: 0, transition: { duration: 0.45 } }} role="status" aria-label="กำลังโหลด">
      <Logo3D size={120} interactive={false} delay={0} />
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.35 } }}>
        {APP.name}
      </motion.p>
    </motion.div>
  )
}

export function WelcomeCard({ user, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4200)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <motion.div
      className="welcome"
      role="status"
      initial={{ opacity: 0, y: -24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.96 }}
      transition={spring}
      onClick={onDone}
    >
      <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.15 }}>
        <Avatar user={user} size={46} />
      </motion.span>
      <div>
        <b title={user.display}>ยินดีต้อนรับ, {user.display}</b>
        <span>{APP.welcome}</span>
      </div>
    </motion.div>
  )
}

export function DevBanner() {
  const [fail, setFail] = useState(() => store.get(MOCK_FAIL_KEY, sessionStorage) === '1')
  return (
    <div className="dev-banner">
      <span>DEV · mock backend + mock LINE (ไม่ถูก build ไป production)</span>
      <label>
        <input
          type="checkbox"
          checked={fail}
          onChange={(e) => {
            setFail(e.target.checked)
            store.set(MOCK_FAIL_KEY, e.target.checked ? '1' : null, sessionStorage)
          }}
        />
        จำลองบันทึกโหวตล้มเหลว
      </label>
    </div>
  )
}
