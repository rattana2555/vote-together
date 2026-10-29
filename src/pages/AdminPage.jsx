import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../components/Button.jsx'
import Results from './admin/Results.jsx'
import Campaigns from './admin/Campaigns.jsx'
import Admins from './admin/Admins.jsx'
import { api } from '../lib/api.js'
import { navigate } from '../lib/router.js'
import { page, spring } from '../lib/motion.js'
import { useSession } from '../state/session.jsx'

const TABS = [
  ['results', 'ผลโหวต'],
  ['campaigns', 'กิจกรรม'],
  ['admins', 'ผู้ดูแล'],
]

export default function AdminPage() {
  const { user, ready } = useSession()
  const [tab, setTab] = useState('results')
  const [campaigns, setCampaigns] = useState(null)
  const [error, setError] = useState('')
  const isAdmin = user?.role === 'admin'

  const reload = useCallback(async () => {
    try {
      setCampaigns(await api.campaigns())
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) reload()
  }, [isAdmin, reload])

  if (ready && !isAdmin) {
    return (
      <motion.main {...page} className="page section">
        <div className="empty">
          <p>หน้านี้สำหรับผู้ดูแลกิจกรรมเท่านั้น</p>
          <Button variant="ghost" onClick={() => navigate(user ? '/' : '/login')}>
            {user ? 'กลับไปหน้าผลงาน' : 'เข้าสู่ระบบ'}
          </Button>
        </div>
      </motion.main>
    )
  }

  return (
    <motion.main {...page} className="page section admin">
      <div className="section-head">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            VOTE TOGETHER · Admin
          </span>
          <h2>แดชบอร์ด</h2>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-on' : ''} onClick={() => setTab(key)}>
            {tab === key && <motion.span layoutId="admin-tab" className="tab-pill" transition={spring} />}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.25 } }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
        >
          {tab === 'results' && <Results campaigns={campaigns} />}
          {tab === 'campaigns' && <Campaigns campaigns={campaigns} reload={reload} />}
          {tab === 'admins' && user && <Admins me={user} />}
        </motion.div>
      </AnimatePresence>
    </motion.main>
  )
}
