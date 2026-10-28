import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { easeOut } from '../lib/motion.js'

// depth: 0 = far (moves least, softly blurred), 1 = near (moves most)
const OBJECTS = [
  { kind: 'orb', x: 8, y: 14, size: 120, depth: 0.25, tone: 'violet', blur: true },
  { kind: 'orb', x: 82, y: 8, size: 78, depth: 0.55, tone: 'aurora' },
  { kind: 'card', x: 70, y: 58, w: 132, h: 88, depth: 0.8, rot: -14 },
  { kind: 'orb', x: 18, y: 72, size: 56, depth: 0.9, tone: 'coral' },
  { kind: 'card', x: 4, y: 38, w: 96, h: 120, depth: 0.45, rot: 10, small: true },
  { kind: 'orb', x: 92, y: 76, size: 150, depth: 0.15, tone: 'aurora', blur: true, small: true },
]

function Item({ o, i, scrollY, reduce }) {
  const y = useTransform(scrollY, [0, 800], [0, reduce ? 0 : -260 * o.depth])
  const style = {
    left: `${o.x}%`,
    top: `${o.y}%`,
    y,
    zIndex: Math.round(o.depth * 10),
    filter: o.blur ? 'blur(5px)' : undefined,
    opacity: o.blur ? 0.7 : 1,
  }
  return (
    <motion.div
      className={`amb amb-${o.kind}${o.small ? ' hide-sm' : ''}`}
      style={style}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: o.blur ? 0.7 : 1, scale: 1 }}
      transition={{ duration: 1.1, delay: 0.25 + i * 0.09, ease: easeOut }}
    >
      <div
        className="amb-float"
        style={{ '--dur': `${7 + i * 1.3}s`, '--delay': `${-i * 1.7}s`, '--rot': `${o.rot ?? 0}deg` }}
      >
        {o.kind === 'orb' ? (
          <span className={`orb orb-${o.tone}`} style={{ width: o.size, height: o.size }} />
        ) : (
          <span className="glass-card" style={{ width: o.w, height: o.h }}>
            <i />
            <i />
          </span>
        )}
      </div>
    </motion.div>
  )
}

export default function AmbientScene() {
  const { scrollY } = useScroll()
  const reduce = useReducedMotion()
  return (
    <div className="ambient-scene" aria-hidden="true">
      {OBJECTS.map((o, i) => (
        <Item key={i} o={o} i={i} scrollY={scrollY} reduce={reduce} />
      ))}
    </div>
  )
}
