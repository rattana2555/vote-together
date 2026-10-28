import { useId } from 'react'

export default function LogoMark({ size = 32 }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#55C7FF" />
          <stop offset="1" stopColor="#7657FF" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9B85FF" />
          <stop offset="1" stopColor="#FF8D9C" />
        </linearGradient>
      </defs>
      <rect x="20" y="6" width="36" height="36" rx="11" fill={`url(#${id}b)`} opacity=".6" transform="rotate(12 38 24)" />
      <rect x="8" y="16" width="40" height="40" rx="12" fill={`url(#${id}a)`} />
      <path d="M18.5 36.5l7 7 14-15.5" fill="none" stroke="#F8F9FF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Wordmark({ size = 30 }) {
  return (
    <span className="wordmark">
      <LogoMark size={size} />
      <span className="wordmark-text">
        VOTE <b>TOGETHER</b>
      </span>
    </span>
  )
}
