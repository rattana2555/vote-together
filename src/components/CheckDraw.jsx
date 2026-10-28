import { motion } from 'framer-motion'
import { easeOut } from '../lib/motion.js'

export default function CheckDraw({ size = 72, delay = 0 }) {
  return (
    <svg className="check-draw" width={size} height={size} viewBox="0 0 72 72" aria-hidden="true">
      <motion.circle
        cx="36"
        cy="36"
        r="32"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay, ease: easeOut }}
      />
      <motion.path
        d="M22 37.5l9.5 9.5L51 27"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.38, delay: delay + 0.4, ease: easeOut }}
      />
    </svg>
  )
}
