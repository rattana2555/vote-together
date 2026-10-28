import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { press } from '../lib/motion.js'

const Button = forwardRef(function Button({ variant = 'primary', size, className = '', children, ...rest }, ref) {
  const cls = ['btn', `btn-${variant}`, size && `btn-${size}`, className].filter(Boolean).join(' ')
  return (
    <motion.button ref={ref} type="button" className={cls} whileTap={rest.disabled ? undefined : press} {...rest}>
      {variant === 'primary' && <span className="btn-sheen" aria-hidden="true" />}
      <span className="btn-label">{children}</span>
    </motion.button>
  )
})

export default Button

export function LineIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.5C6.5 2.5 2 6.1 2 10.6c0 4 3.6 7.4 8.4 8 .3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.5 1.1-.5 5.9-3.5 8-6 1.5-1.6 1.9-3.2 1.9-4.9C22 6.1 17.5 2.5 12 2.5Zm-3.8 10.9H6.3a.5.5 0 0 1-.5-.5V9a.5.5 0 0 1 1 0v3.4h1.4a.5.5 0 0 1 0 1Zm2-.5a.5.5 0 0 1-1 0V9a.5.5 0 0 1 1 0v3.9Zm4.6 0a.5.5 0 0 1-.9.3L12 10.6v2.3a.5.5 0 0 1-1 0V9a.5.5 0 0 1 .9-.3l1.9 2.6V9a.5.5 0 0 1 1 0v3.9Zm3.1-2.5a.5.5 0 0 1 0 1h-1.4v.9h1.4a.5.5 0 0 1 0 1h-1.9a.5.5 0 0 1-.5-.5V9a.5.5 0 0 1 .5-.5h1.9a.5.5 0 0 1 0 1h-1.4v.9h1.4Z"
      />
    </svg>
  )
}
