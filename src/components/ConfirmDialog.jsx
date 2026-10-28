import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from './Button.jsx'
import { shake, spring } from '../lib/motion.js'

export default function ConfirmDialog({ entry, status, error, errorKey, onConfirm, onCancel }) {
  const busy = status === 'submitting'
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <motion.div className="dialog-layer" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <motion.div
        className="dialog-backdrop"
        onClick={() => !busy && onCancel()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="dialog"
        initial={{ opacity: 0, scale: 0.86, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 10, transition: { duration: 0.18 } }}
        transition={spring}
      >
        <div className="dialog-thumb">
          <img src={entry.image} alt="" />
          <span className="ring" aria-hidden="true">
            <i />
            <i />
          </span>
        </div>
        <h3 id="confirm-title">ยืนยันโหวต “{entry.title}”?</h3>
        <p>1 บัญชี LINE โหวตได้ 1 ครั้ง และเปลี่ยนภายหลังไม่ได้</p>
        <AnimatePresence>
          {error && (
            <motion.p
              key="err"
              className="dialog-error"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        <motion.div key={errorKey} animate={error ? shake : undefined} className="dialog-actions">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            ยกเลิก
          </Button>
          <Button onClick={onConfirm} disabled={busy} aria-busy={busy}>
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" /> กำลังบันทึก…
              </>
            ) : error ? (
              'ลองอีกครั้ง'
            ) : (
              'ยืนยันโหวต'
            )}
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
