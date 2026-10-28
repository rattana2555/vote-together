export const APP = {
  name: 'VOTE TOGETHER',
  tagline: 'Your Vote. Our Moment.',
  taglineTh: 'ทุกเสียงมีความหมาย ทุกการเลือกสร้างช่วงเวลาร่วมกัน',
  welcome: 'Your voice makes a difference',
  version: '2.0',
  hubUrl: 'https://rattanaphaiboon.github.io/app/rattana-hub.html',
}

export const ENV = {
  apiBase: import.meta.env.VITE_API_BASE || '',
  liffId: import.meta.env.VITE_LIFF_ID || '',
  isMock: import.meta.env.DEV && import.meta.env.VITE_MOCK === '1',
  mockAuthorizeUrl: import.meta.env.VITE_LINE_AUTHORIZE_URL || '',
}

export const isLoginConfigured = () => Boolean(ENV.apiBase && (ENV.liffId || ENV.isMock))
