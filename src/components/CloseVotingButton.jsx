import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Button from './Button.jsx'
import ConfirmBox from './ConfirmBox.jsx'
import { api } from '../lib/api.js'

// Admin: stop accepting votes right now, or open the campaign again.
export default function CloseVotingButton({ campaign, onChange, size = 'sm' }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const closing = !campaign.closed

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      const next = await api.setClosed(campaign.id, closing)
      setConfirm(false)
      onChange?.(next)
    } catch (err) {
      setError(err.message)
      setConfirm(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button size={size} variant={closing ? 'ghost' : 'primary'} className={closing ? 'btn-close-vote' : ''} onClick={() => setConfirm(true)}>
        {closing ? 'ปิดโหวตตอนนี้' : 'เปิดโหวตอีกครั้ง'}
      </Button>
      {error && <span className="form-error">{error}</span>}
      <AnimatePresence>
        {confirm && (
          <ConfirmBox
            key="close"
            title={closing ? `ปิดรับโหวต “${campaign.title}”?` : `เปิดรับโหวต “${campaign.title}” อีกครั้ง?`}
            confirmLabel={closing ? 'ปิดโหวต' : 'เปิดโหวต'}
            danger={closing}
            busy={busy}
            onConfirm={run}
            onCancel={() => setConfirm(false)}
          >
            {closing ? (
              <p>ทุกคนจะโหวตหรือส่งคำตอบเพิ่มไม่ได้ทันที คะแนนที่มีอยู่ยังอยู่ครบ ถ้าตั้งให้เห็นผล “หลังปิดโหวต” ผลจะแสดงให้ทุกคนเห็นตอนนี้ เปิดอีกครั้งได้ภายหลัง</p>
            ) : (
              <p>กิจกรรมจะกลับมารับโหวตได้ และวันปิดโหวตเดิมจะถูกล้าง (ตั้งใหม่ได้ในหน้าแก้ไขกิจกรรม)</p>
            )}
          </ConfirmBox>
        )}
      </AnimatePresence>
    </>
  )
}
