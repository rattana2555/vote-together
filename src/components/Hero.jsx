import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import Logo3D from './Logo3D.jsx'
import AmbientScene from './AmbientScene.jsx'
import Button, { LineIcon } from './Button.jsx'
import { APP, isLoginConfigured } from '../config.js'
import { rise, stagger } from '../lib/motion.js'
import { useSession } from '../state/session.jsx'
import { navigate } from '../lib/router.js'

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Hero({ campaign, entryCount, onStart }) {
  const { user } = useSession()
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const sceneY = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 90])
  const sceneScale = useTransform(scrollY, [0, 600], [1, reduce ? 1 : 0.9])

  return (
    <section className="hero">
      <motion.div className="hero-copy" variants={stagger(0.09, 0.2)} initial="hidden" animate="show">
        {campaign && (
          <motion.span variants={rise} className="eyebrow">
            <span className="eyebrow-dot" />
            {campaign.title}
          </motion.span>
        )}
        <motion.h1 variants={rise} className="hero-title">
          VOTE <span className="grad-text">TOGETHER</span>
        </motion.h1>
        <motion.p variants={rise} className="hero-tagline">
          {APP.tagline}
        </motion.p>
        <motion.p variants={rise} className="hero-sub">
          {APP.taglineTh}
        </motion.p>
        <motion.div variants={rise} className="hero-cta">
          <Button size="lg" onClick={onStart}>
            เริ่มโหวตเลย
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </Button>
          {!user && isLoginConfigured() && (
            <Button variant="line" size="lg" onClick={() => navigate('/login')}>
              <LineIcon /> เข้าสู่ระบบด้วย LINE
            </Button>
          )}
        </motion.div>
        {campaign && (
          <motion.ul variants={rise} className="hero-facts">
            <li>
              <b>{entryCount}</b> ผลงาน
            </li>
            <li>
              ปิดโหวต <b>{fmtDate(campaign.endsAt)}</b>
            </li>
            <li>
              <b>1</b> สิทธิ์ / บัญชี LINE
            </li>
          </motion.ul>
        )}
      </motion.div>

      <motion.div className="hero-scene" style={{ y: sceneY, scale: sceneScale }}>
        <AmbientScene />
        <Logo3D size={200} />
      </motion.div>
    </section>
  )
}
