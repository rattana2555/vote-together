export const spring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }
export const softSpring = { type: 'spring', stiffness: 220, damping: 26 }
export const press = { scale: 0.96, transition: { type: 'spring', stiffness: 600, damping: 30 } }
export const easeOut = [0.22, 1, 0.36, 1]

export const page = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: easeOut } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.22, ease: easeOut } },
}

export const stagger = (gap = 0.07, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
})

export const rise = {
  hidden: { opacity: 0, y: 22, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: easeOut } },
}

export const shake = { x: [0, -8, 7, -5, 4, -2, 0], transition: { duration: 0.45 } }
