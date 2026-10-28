export const APP = {
  name: 'VOTE TOGETHER',
  tagline: 'Your Vote. Our Moment.',
  taglineTh: 'ทุกเสียงมีความหมาย ทุกการเลือกสร้างช่วงเวลาร่วมกัน',
  welcome: 'Your voice makes a difference',
  version: '1.1',
}

export const ENV = {
  apiBase: (import.meta.env.VITE_API_BASE || '').replace(/\/$/, ''),
  lineChannelId: import.meta.env.VITE_LINE_CHANNEL_ID || '',
  lineAuthorizeUrl: import.meta.env.VITE_LINE_AUTHORIZE_URL || 'https://access.line.me/oauth2/v2.1/authorize',
  isMock: import.meta.env.DEV && import.meta.env.VITE_MOCK === '1',
}

export const isLoginConfigured = () => Boolean(ENV.apiBase && ENV.lineChannelId)
