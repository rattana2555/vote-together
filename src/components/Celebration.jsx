import { useEffect, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import CheckDraw from './CheckDraw.jsx'
import { spring } from '../lib/motion.js'

const COLORS = ['#7657FF', '#55C7FF', '#FF8D9C', '#E9E5FF', '#9B85FF', '#FFD38A']

export default function Celebration({ message, title = 'บันทึกคะแนนแล้ว', onDone }) {
  const reduce = useReducedMotion()
  const particles = useMemo(
    () =>
      Array.from({ length: reduce ? 0 : 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.4
        const dist = 110 + Math.random() * 120
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 40,
          rot: Math.random() * 360,
          size: 6 + Math.random() * 7,
          round: i % 3 === 0,
          color: COLORS[i % COLORS.length],
          delay: Math.random() * 0.12,
        }
      }),
    [reduce],
  )

  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      className="celebrate"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      onClick={onDone}
    >
      <motion.div className="celebrate-card" initial={{ scale: 0.7, y: 20 }} animate={{ scale: 1, y: 0 }} transition={spring}>
        <div className="celebrate-burst" aria-hidden="true">
          {particles.map((p, i) => (
            <motion.span
              key={i}
              className="particle"
              style={{ width: p.size, height: p.size, background: p.color, borderRadius: p.round ? '50%' : 3 }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
              animate={{ x: p.x, y: [0, p.y, p.y + 70], opacity: [1, 1, 0], scale: 1, rotate: p.rot }}
              transition={{ duration: 1.5, delay: 0.35 + p.delay, ease: [0.1, 0.7, 0.3, 1] }}
            />
          ))}
        </div>
        <span className="celebrate-check">
          <CheckDraw size={84} delay={0.1} />
        </span>
        <h3>{title}</h3>
        <p>{message}</p>
      </motion.div>
    </motion.div>
  )
}
