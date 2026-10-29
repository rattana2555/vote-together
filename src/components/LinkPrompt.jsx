import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button, { LineIcon } from './Button.jsx'
import { api } from '../lib/api.js'
import { ENV } from '../config.js'
import { navigate } from '../lib/router.js'
import { shake, spring } from '../lib/motion.js'
import { useSession } from '../state/session.jsx'

const POLL_MS = 3000

// First login only: the employee sends a one-time code in the LINE HR chat so the backend
// can see their real LINE HR userId and tie it to this LINE login.
export default function LinkPrompt() {
  const { pendingLink, cancelLink, finishLogin } = useSession()
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const chatUrl = ENV.isMock
    ? `/mock-line/hr-chat?code=${encodeURIComponent(pendingLink.code)}`
    : `https://line.me/R/oaMessage/${encodeURIComponent(pendingLink.oaId)}/?${encodeURIComponent(pendingLink.code)}`

  useEffect(() => {
    let alive = true
    let timer = 0
    const check = async () => {
      clearTimeout(timer)
      try {
        const res = await api.checkLink(pendingLink.linkToken)
        if (!alive) return
        if (res.linked) {
          finishLogin(res)
          navigate('/', { replace: true })
          return
        }
      } catch (err) {
        if (!alive) return
        setError(err.message)
        if (err.status === 401 || err.status === 403) return
      }
      timer = setTimeout(check, POLL_MS)
    }
    const onVisible = () => document.visibilityState === 'visible' && check()
    check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pendingLink.linkToken, finishLogin])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pendingLink.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked: the code is on screen */
    }
  }

  return (
    <motion.div className="link-prompt" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <h2>ยืนยันตัวตนครั้งแรก</h2>
      <p>
        ส่งรหัสนี้ในแชท <b>LINE HR</b> เพื่อยืนยันว่าบัญชี “{pendingLink.lineName}” เป็นพนักงาน ทำครั้งเดียว ครั้งต่อไปเข้าได้ทันที
      </p>
      <button type="button" className="link-code" onClick={copy} aria-label={`คัดลอกรหัส ${pendingLink.code}`}>
        {pendingLink.code}
        <span>{copied ? 'คัดลอกแล้ว' : 'แตะเพื่อคัดลอก'}</span>
      </button>
      <a className="btn btn-line btn-lg btn-block" href={chatUrl}>
        <span className="btn-label">
          <LineIcon size={24} /> เปิดแชท LINE HR แล้วกดส่ง
        </span>
      </a>
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p key="err" className="form-error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1, ...shake }}>
            {error}
          </motion.p>
        ) : (
          <motion.p key="wait" className="link-wait" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span className="spinner" aria-hidden="true" /> รอข้อความจาก LINE HR… ส่งแล้วกลับมาหน้านี้ได้เลย
          </motion.p>
        )}
      </AnimatePresence>
      <Button variant="ghost" size="sm" onClick={cancelLink}>
        ยกเลิก
      </Button>
    </motion.div>
  )
}
