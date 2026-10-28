import { useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { Wordmark } from './LogoMark.jsx'
import Avatar from './Avatar.jsx'
import Button from './Button.jsx'
import { linkProps, navigate } from '../lib/router.js'
import { useSession } from '../state/session.jsx'
import { spring } from '../lib/motion.js'

function ThemeToggle({ theme }) {
  return (
    <button type="button" className="icon-btn" onClick={theme.toggle} aria-label="สลับโหมดสว่าง/มืด">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
      </svg>
    </button>
  )
}

export default function Header({ path, theme }) {
  const { user, logout } = useSession()
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 8))

  const nav = [
    { to: '/', label: 'ผลงาน' },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'แดชบอร์ด' }] : []),
  ]

  return (
    <header className={`topbar${scrolled ? ' is-scrolled' : ''}`}>
      <div className="topbar-inner">
        <a {...linkProps('/')} className="brand-link" aria-label="VOTE TOGETHER หน้าแรก">
          <Wordmark size={30} />
        </a>
        <nav className="topnav" aria-label="เมนูหลัก">
          {nav.map((n) => (
            <a key={n.to} {...linkProps(n.to)} className={`topnav-link${path === n.to ? ' is-active' : ''}`}>
              {path === n.to && <motion.span layoutId="nav-pill" className="topnav-pill" transition={spring} />}
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
        <div className="topbar-actions">
          <ThemeToggle theme={theme} />
          {user ? (
            <div className="user-menu">
              <button type="button" className="user-chip" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
                <Avatar user={user} size={30} />
                <span className="user-chip-name">{user.name}</span>
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div
                    className="menu-pop"
                    initial={{ opacity: 0, scale: 0.92, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={spring}
                  >
                    {nav.map((n) => (
                      <a key={n.to} {...linkProps(n.to)} className="menu-nav" onClickCapture={() => setMenu(false)}>
                        {n.label}
                      </a>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setMenu(false)
                        logout()
                      }}
                    >
                      ออกจากระบบ
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            path !== '/login' && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                เข้าสู่ระบบ
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  )
}
