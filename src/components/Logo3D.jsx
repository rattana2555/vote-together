import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import { easeOut } from '../lib/motion.js'

const LAYERS = 7

export default function Logo3D({ size = 180, interactive = true, delay = 0.15 }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const rx = useSpring(useMotionValue(0), { stiffness: 120, damping: 18 })
  const ry = useSpring(useMotionValue(0), { stiffness: 120, damping: 18 })

  useEffect(() => {
    if (!interactive || reduce || !matchMedia('(hover: hover)').matches) return
    let frame = 0
    const onMove = (e) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        rx.set((e.clientY / innerHeight - 0.5) * -14)
        ry.set((e.clientX / innerWidth - 0.5) * 18)
      })
    }
    addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('pointermove', onMove)
    }
  }, [interactive, reduce, rx, ry])

  return (
    <motion.div
      ref={ref}
      className="logo3d"
      style={{ '--size': `${size}px` }}
      initial={{ opacity: 0, scale: 0.7, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.9, delay, ease: easeOut }}
      aria-hidden="true"
    >
      <div className="logo3d-glow" />
      <motion.div className="logo3d-tilt" style={{ rotateX: rx, rotateY: ry }}>
        <div className="logo3d-float">
          <div className="logo3d-spin">
            <div className="l3-back" />
            {Array.from({ length: LAYERS }, (_, i) => (
              <div key={i} className="l3-side" style={{ '--z': `${i * 2.4}px` }} />
            ))}
            <div className="l3-face" style={{ '--z': `${LAYERS * 2.4}px` }}>
              <svg viewBox="0 0 100 100">
                <motion.path
                  d="M27 53l15 15 32-35"
                  fill="none"
                  stroke="#F8F9FF"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: delay + 0.55, ease: easeOut }}
                />
              </svg>
              <span className="l3-sheen" />
            </div>
          </div>
        </div>
      </motion.div>
      <div className="logo3d-shadow" />
    </motion.div>
  )
}
