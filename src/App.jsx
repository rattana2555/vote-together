import { AnimatePresence, MotionConfig } from 'framer-motion'
import Header from './components/Header.jsx'
import { DevBanner, LoadingScreen, WelcomeCard } from './components/Overlays.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import { APP, ENV } from './config.js'
import { usePath } from './lib/router.js'
import { useTheme } from './lib/theme.js'
import { useSession } from './state/session.jsx'

const ROUTES = {
  '/': HomePage,
  '/login': LoginPage,
  '/admin': AdminPage,
}

export default function App() {
  const path = usePath()
  const theme = useTheme()
  const { ready, user, welcome, dismissWelcome } = useSession()
  const Page = ROUTES[path] ?? HomePage

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-bg" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {ENV.isMock && <DevBanner />}
      <Header path={path} theme={theme} />
      <AnimatePresence mode="wait" onExitComplete={() => scrollTo(0, 0)}>
        <Page key={path} />
      </AnimatePresence>
      <footer className="footer">
        <span>
          {APP.name} · {APP.tagline}
        </span>
        <span>v{APP.version}</span>
      </footer>
      <AnimatePresence>{welcome && user && <WelcomeCard key="welcome" user={user} onDone={dismissWelcome} />}</AnimatePresence>
      <AnimatePresence>{!ready && <LoadingScreen key="loading" />}</AnimatePresence>
    </MotionConfig>
  )
}
