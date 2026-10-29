import { useEffect } from 'react'
import { motion } from 'framer-motion'
import Button from './Button.jsx'
import { spring } from '../lib/motion.js'

// Generic spring dialog for admin confirmations (activate a campaign, delete an entry).
export default function ConfirmBox({ title, children, confirmLabel, danger, busy, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <motion.div className="dialog-layer" role="alertdialog" aria-modal="true" aria-labelledby="confirm-box-title">
      <motion.div className="dialog-backdrop" onClick={() => !busy && onCancel()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        className="dialog"
        initial={{ opacity: 0, scale: 0.86, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 10, transition: { duration: 0.18 } }}
        transition={spring}
      >
        <h3 id="confirm-box-title">{title}</h3>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            ยกเลิก
          </Button>
          <Button className={danger ? 'btn-danger' : ''} onClick={onConfirm} disabled={busy}>
            {busy ? <span className="spinner" aria-hidden="true" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
