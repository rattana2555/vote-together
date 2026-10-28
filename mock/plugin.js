// Dev-only mock backend. Loaded by vite.config.js when VITE_MOCK=1 (see .env.development).
// It mirrors the action contract of gas/Code.gs so the UI can be exercised end to end,
// including a stand-in for the LIFF login round trip.
import { randomBytes } from 'node:crypto'

const SHAPES = [
  [1200, 1500], [1200, 900], [1200, 1200], [1200, 1700],
  [1200, 800], [1200, 1400], [1200, 1000], [1200, 1600],
  [1200, 1200], [1200, 900], [1200, 1500], [1200, 1100],
]
const TITLES = [
  ['zombie ที่ปตท', 'สมชาย ใจดี (ต้น)'], ['แม่มดสาขาบายพาส', 'สุดา แสงทอง (นก)'],
  ['ผีกระสือคลังสินค้า', 'วิชัย มั่นคง (เบน)'], ['แวมไพร์ฝ่ายบัญชี', 'กมลา ศรีสุข (มล)'],
  ['มัมมี่ห้องประชุม', 'อนันต์ วงศ์ดี (โจ้)'], ['ฟักทองยิ้มกว้าง', 'พิมพา ทองมา (แพรว)'],
  ['ผีแม่นากเวอร์ชันเซลส์', 'ชนิดา พูลสุข (โบว์)'], ['โจรสลัดจัดซื้อ', 'ณัฐพล บุญเรือง (แจ็ค)'],
  ['ซาดาโกะออนไลน์', 'ปวีณา สายทอง (จา)'], ['หมอผีประจำสาขา', 'ธนา อินทร์แก้ว (เล็ก)'],
  ['ค้างคาวกะดึก', 'มณีรัตน์ ศักดิ์ดี (บุ๊ค)'], ['ผีปอบสายหวาน', 'กิตติ พรหมมา (หนึ่ง)'],
]
const PALETTES = [
  ['#101426', '#7657FF', '#55C7FF', '#FF8D9C'], ['#1B2A4A', '#55C7FF', '#E9E5FF', '#7657FF'],
  ['#2A1446', '#FF8D9C', '#FFC7A1', '#7657FF'], ['#0E2233', '#3FE0C5', '#55C7FF', '#E9E5FF'],
  ['#25183F', '#B89CFF', '#FF8D9C', '#F8F9FF'], ['#0F1E2E', '#55C7FF', '#7657FF', '#FFD38A'],
]

const entries = SHAPES.map(([width, height], i) => ({
  id: `img${i + 1}`,
  title: TITLES[i][0],
  author: TITLES[i][1],
  imageId: `img${i + 1}`,
  width,
  height,
}))
const votes = []
const sessions = new Map()

// Mirrors LINE_USERS: only registered userIds can log in.
const USERS = {
  'U-dev-admin': { uid: 'U-dev-admin', empId: '90001', name: 'ทดสอบ แอดมิน', nick: 'แอด', branch: 'HQ', dept: 'ทรัพยากรบุคคล', avatarId: 'av1', role: 'admin' },
  'U-dev-voter': { uid: 'U-dev-voter', empId: '90002', name: 'ทดสอบ พนักงาน', nick: 'โหวต', branch: 'W1', dept: 'ขาย', avatarId: 'av2', role: 'voter' },
}
const profile = (u) => ({
  id: u.uid,
  empId: u.empId,
  name: u.name,
  nick: u.nick,
  display: `${u.name} (${u.nick})`,
  branch: u.branch,
  dept: u.dept,
  avatarId: u.avatarId,
  role: u.role,
})

let config = {
  sheetUrl: 'https://docs.google.com/spreadsheets/d/MOCK-SHEET-ID-0000000000/edit?gid=0',
  title: 'HALLOWEEN 2026 หลอนให้สุด แล้วหยุดที่ความปัง',
  subtitle: 'โหวตภาพชุดฮาโลวีนที่ปังที่สุด เลือกได้ 1 ภาพต่อ 1 บัญชี LINE',
  endsAt: '',
  showCounts: true,
}
const detected = () => ({
  spreadsheet: 'MOCK · คำตอบแบบฟอร์ม',
  tab: 'การตอบแบบฟอร์ม 1',
  entryCount: entries.length,
  columns: { title: 'ชื่อภาพ สโลแกน แคปชั่น', fullName: 'ชื่อจริง - นามสกุล', nick: 'ชื่อเล่น', image: 'อัพโหลดภาพถ่ายในชุดฮาโลวีน' },
})
const closed = () => Boolean(config.endsAt) && Date.now() > new Date(config.endsAt).getTime()
const countOf = (id) => votes.filter((v) => v.entryId === id).length

function art(id) {
  const i = Number(id.replace(/\D/g, '')) - 1 + (id.startsWith('av') ? 6 : 0)
  const [w, h] = id.startsWith('av') ? [400, 400] : SHAPES[i] ?? [1200, 1200]
  const [bg, a, b, c] = PALETTES[i % PALETTES.length]
  let seed = i * 9301 + 49297
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  const blobs = Array.from({ length: 6 }, (_, k) => {
    const r = (0.15 + rnd() * 0.35) * w
    return `<circle cx="${(rnd() * w).toFixed(0)}" cy="${(rnd() * h).toFixed(0)}" r="${r.toFixed(0)}" fill="${[a, b, c][k % 3]}" opacity="${(0.35 + rnd() * 0.4).toFixed(2)}"/>`
  }).join('')
  const ridge = Array.from({ length: 9 }, (_, k) => `${(k / 8) * w},${(h * (0.62 + rnd() * 0.16)).toFixed(0)}`).join(' ')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs><filter id="f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${w / 14}"/></filter>
<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${a}"/></linearGradient>
<linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}" stop-opacity=".2"/><stop offset="1" stop-color="${bg}" stop-opacity=".95"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/><g filter="url(#f)">${blobs}</g>
<circle cx="${w * 0.68}" cy="${h * 0.34}" r="${w * 0.11}" fill="${c}" opacity=".9"/>
<polygon points="0,${h} ${ridge} ${w},${h}" fill="url(#m)"/>
</svg>`
}
const svgData = (id) => `data:image/svg+xml;base64,${Buffer.from(art(id)).toString('base64')}`

function send(res, status, body, type = 'application/json') {
  res.statusCode = status
  res.setHeader('Content-Type', type)
  res.end(type === 'application/json' ? JSON.stringify(body) : body)
}

async function readJson(req) {
  let raw = ''
  for await (const chunk of req) raw += chunk
  return raw ? JSON.parse(raw) : {}
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

class Fail extends Error {
  constructor(status, code, message, extra) {
    super(message)
    this.body = { ok: false, status, code, message, ...extra }
  }
}

function authorizePage(q) {
  const back = (params) => `${q.get('redirect_uri')}?${new URLSearchParams(params)}`
  const btn = (label, token, cls) => `<a class="${cls}" href="${back({ mock_id_token: token })}">${label}</a>`
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mock LINE Login (dev)</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f2f3f5;font-family:system-ui,sans-serif;color:#111}
.c{width:min(380px,calc(100vw - 32px));background:#fff;border-radius:16px;padding:24px;box-shadow:0 8px 30px #0001}
.t{display:inline-block;background:#FFE7A3;color:#6b4e00;font-size:12px;font-weight:700;padding:4px 8px;border-radius:6px}
h1{font-size:18px;margin:14px 0 6px}p{font-size:14px;color:#555;line-height:1.5}
a{display:block;text-align:center;padding:13px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:10px}
.ok{background:#06C755;color:#fff}.alt{background:#e7f8ee;color:#05893c}.no{background:#eee;color:#333}</style></head><body><div class="c">
<span class="t">DEV ONLY · ไม่ใช่ LINE จริง</span><h1>จำลองการเข้าสู่ระบบ LINE (LIFF)</h1>
<p>มีเฉพาะตอน <code>npm run dev</code> ของจริงจะเปิด LINE แล้วส่ง ID token ให้ backend ตรวจกับ LINE และแท็บ LINE_USERS</p>
${btn('พนักงาน (แอดมิน)', 'mock-U-dev-admin', 'ok')}
${btn('พนักงาน (ผู้โหวตทั่วไป)', 'mock-U-dev-voter', 'alt')}
${btn('LINE ที่ยังไม่ลงทะเบียนพนักงาน', 'mock-U-not-registered', 'no')}
<a class="no" href="${back({ error: 'access_denied' })}">ยกเลิก</a>
</div></body></html>`
}

const requireAdmin = (u) => {
  if (u.role !== 'admin') throw new Fail(403, 'FORBIDDEN', 'สำหรับผู้ดูแลกิจกรรมเท่านั้น')
}

const actions = {
  campaign: () => ({
    campaign: { id: 'mock', title: config.title, subtitle: config.subtitle, endsAt: config.endsAt || null, showCounts: config.showCounts, closed: closed() },
  }),
  login: (b) => {
    const idToken = String(b.idToken || '')
    if (!idToken.startsWith('mock-')) throw new Fail(401, 'LINE_VERIFY_FAILED', 'ยืนยันตัวตนกับ LINE ไม่สำเร็จ หรือหมดอายุ กรุณาเข้าสู่ระบบใหม่')
    const u = USERS[idToken.slice(5)]
    if (!u) throw new Fail(403, 'NOT_REGISTERED', 'บัญชี LINE นี้ยังไม่ได้ลงทะเบียนพนักงาน กรุณาลงทะเบียนผ่าน LINE OA ของบริษัทก่อน')
    const token = randomBytes(16).toString('hex')
    sessions.set(token, u.uid)
    return { token, user: profile(u), votedEntryId: votes.find((v) => v.uid === u.uid)?.entryId ?? null }
  },
  me: (b, u) => ({ user: profile(u), votedEntryId: votes.find((v) => v.uid === u.uid)?.entryId ?? null }),
  entries: (b, u) => ({
    entries: entries.map((e) => ({ ...e, votes: config.showCounts || u.role === 'admin' ? countOf(e.id) : undefined })),
  }),
  images: (b) => ({ images: Object.fromEntries((b.ids || []).slice(0, 8).map((id) => [id, svgData(id)])) }),
  vote: async (b, u) => {
    await wait(500)
    if (b.mockFail) throw new Fail(503, 'BUSY', 'ระบบบันทึกคะแนนไม่สำเร็จ กรุณาลองอีกครั้ง')
    if (closed()) throw new Fail(403, 'CLOSED', 'ปิดรับโหวตแล้ว')
    const entry = entries.find((e) => e.id === b.entryId)
    if (!entry) throw new Fail(404, 'ENTRY_NOT_FOUND', 'ไม่พบผลงานนี้')
    const mine = votes.find((v) => v.uid === u.uid)
    if (mine) throw new Fail(409, 'ALREADY_VOTED', 'บัญชีนี้โหวตไปแล้ว', { votedEntryId: mine.entryId })
    votes.push({ uid: u.uid, entryId: entry.id })
    return { entryId: entry.id, votes: config.showCounts ? countOf(entry.id) : undefined }
  },
  stats: (b, u) => {
    requireAdmin(u)
    return {
      totalVotes: votes.length,
      voters: new Set(votes.map((v) => v.uid)).size,
      eligible: Object.keys(USERS).length,
      updatedAt: new Date().toISOString(),
      entries: entries.map((e) => ({ id: e.id, title: e.title, author: e.author, imageId: e.imageId, votes: countOf(e.id) })),
    }
  },
  getConfig: (b, u) => {
    requireAdmin(u)
    return { config, detected: detected() }
  },
  saveConfig: (b, u) => {
    requireAdmin(u)
    if (!/\/d\/[-\w]{20,}/.test(b.config?.sheetUrl || '')) {
      throw new Fail(400, 'BAD_SHEET', 'ลิงก์ชีทไม่ถูกต้อง ให้คัดลอกลิงก์จากแถบที่อยู่ของ Google Sheets')
    }
    config = { ...config, ...b.config, showCounts: Boolean(b.config.showCounts) }
    return { config, detected: detected() }
  },
}
const PUBLIC = new Set(['campaign', 'login'])

export default function mockBackend() {
  return {
    name: 'vote-together-mock-backend',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        if (url.pathname === '/mock-line/authorize') return send(res, 200, authorizePage(url.searchParams), 'text/html; charset=utf-8')
        if (url.pathname !== '/mock-api' || req.method !== 'POST') return next()

        await wait(200 + Math.random() * 250)
        try {
          const body = await readJson(req)
          const fn = actions[body.action]
          if (!fn) throw new Fail(404, 'NOT_FOUND', 'ไม่รู้จักคำสั่งนี้')
          let user = null
          if (!PUBLIC.has(body.action)) {
            user = USERS[sessions.get(body.token)]
            if (!user) throw new Fail(401, 'SESSION_EXPIRED', 'กรุณาเข้าสู่ระบบด้วย LINE อีกครั้ง')
          }
          return send(res, 200, { ok: true, version: 'mock', ...(await fn(body, user)) })
        } catch (err) {
          return send(res, 200, err.body || { ok: false, status: 500, code: 'SERVER_ERROR', message: String(err) })
        }
      })
    },
  }
}
