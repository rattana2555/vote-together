import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Button, { LineIcon } from '../components/Button.jsx'
import GalleryView from '../components/GalleryView.jsx'
import FormView from '../components/FormView.jsx'
import { GallerySkeleton } from '../components/Skeleton.jsx'
import { api } from '../lib/api.js'
import { isLoginConfigured } from '../config.js'
import { linkProps, navigate } from '../lib/router.js'
import { page, rise, stagger } from '../lib/motion.js'
import { useSession } from '../state/session.jsx'
import { SOURCE_LABEL, fmtDeadline } from './HomePage.jsx'

export default function CampaignPage({ id }) {
  const { user, ready, login } = useSession()
  const [campaign, setCampaign] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ready) return
    setCampaign(null)
    setError('')
    api.campaign(id).then(setCampaign, (err) => setError(err.message))
  }, [id, ready, user])

  let body
  if (error) {
    body = (
      <div className="empty">
        <p>{error}</p>
        <Button variant="ghost" onClick={() => navigate('/')}>
          กลับไปหน้ากิจกรรม
        </Button>
      </div>
    )
  } else if (!campaign || !ready) {
    body = <GallerySkeleton />
  } else if (!user) {
    body = (
      <div className="empty gate">
        <p>
          <b>กิจกรรมนี้เปิดให้เฉพาะพนักงาน</b>
          <br />
          เข้าสู่ระบบด้วย LINE ที่ลงทะเบียนกับบริษัทเพื่อร่วมกิจกรรม
        </p>
        {isLoginConfigured() && (
          <Button variant="line" onClick={() => login(`/c/${id}`).catch(() => navigate('/login'))}>
            <LineIcon /> เข้าสู่ระบบด้วย LINE
          </Button>
        )}
      </div>
    )
  } else if (campaign.source === 'form') {
    body = <FormView campaign={campaign} />
  } else {
    body = <GalleryView campaign={campaign} user={user} />
  }

  return (
    <motion.main {...page} className="page section">
      <a {...linkProps('/')} className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        กิจกรรมทั้งหมด
      </a>
      {campaign && (
        <motion.header className="campaign-head" variants={stagger(0.07)} initial="hidden" animate="show">
          <motion.span variants={rise} className="eyebrow">
            <span className="eyebrow-dot" />
            {SOURCE_LABEL[campaign.source]} · {fmtDeadline(campaign)}
          </motion.span>
          <motion.h1 variants={rise}>{campaign.title}</motion.h1>
          {campaign.subtitle && <motion.p variants={rise}>{campaign.subtitle}</motion.p>}
          {!campaign.published && <motion.span variants={rise} className="tag">ซ่อนอยู่ · แอดมินเห็นเป็นตัวอย่าง</motion.span>}
        </motion.header>
      )}
      {body}
    </motion.main>
  )
}
