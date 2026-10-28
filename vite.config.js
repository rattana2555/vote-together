import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import mockBackend from './mock/plugin.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE || '/',
    plugins: [react(), env.VITE_MOCK === '1' && mockBackend()].filter(Boolean),
    server: { port: 5173 },
  }
})
