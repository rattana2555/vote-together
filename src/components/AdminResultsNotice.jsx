import { useState } from 'react'
import { motion } from 'framer-motion'
import Button from './Button.jsx'
import { api } from '../lib/api.js'
import { RESULT_MODE_LABEL } from '../lib/live.js'

const WHAT_VOTERS_SEE = {
  never: 'ผู้โหวตทั่วไปยังไม่เห็นผลสดและแท็บ “อันดับตอนนี้” (เห็นเฉพาะแอดมิน)',
  afterVote: 'ผู้โหวตทั่วไปจะเห็นผลสดหลังจากโหวต/ตอบแล้วเท่านั้น',
  afterClose: 'ผู้โหวตทั่วไปจะเห็นผลหลังปิดโหวตเท่านั้น',
}

// Admins always see results, so tell them what everyone else sees and let them change it right here.
export default function AdminResultsNotice({ campaign, onChange }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const mode = campaign.resultsMode || 'never'
  if (mode === 'always') return null

  const set = async (next) => {
    setBusy(next)
    setError('')
    try {
      onChange(await api.setResultsMode(campaign.id, next))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <motion.div className="admin-notice" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <b>สำหรับแอดมิน · ตั้งไว้: {RESULT_MODE_LABEL[mode]}</b>
        <span>{WHAT_VOTERS_SEE[mode]}</span>
        {error && <span className="form-error">{error}</span>}
      </div>
      <div className="admin-notice-actions">
        <Button size="sm" onClick={() => set('always')} disabled={Boolean(busy)}>
          {busy === 'always' ? <span className="spinner" aria-hidden="true" /> : null} ให้ทุกคนเห็นผลสด
        </Button>
        {mode === 'never' && (
          <Button size="sm" variant="ghost" onClick={() => set('afterVote')} disabled={Boolean(busy)}>
            {busy === 'afterVote' ? <span className="spinner" aria-hidden="true" /> : null} เห็นหลังโหวตแล้ว
          </Button>
        )}
      </div>
    </motion.div>
  )
}
