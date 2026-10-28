// Dev-only mock backend. Loaded by vite.config.js when VITE_MOCK=1 (see .env.development).
// It mimics the real contract documented in README.md so the UI can be exercised end to end,
// including the LINE OAuth round trip (authorize page -> redirect with code -> code exchange).
import { randomBytes, createHash } from 'node:crypto'

const SHAPES = [
  [1200, 1500], [1200, 900], [1200, 1200], [1200, 1700],
  [1200, 800], [1200, 1400], [1200, 1000], [1200, 1600],
  [1200, 1200], [1200, 900], [1200, 1500], [1200, 1100],
]
const TITLES = [
  ['แสงแรกของเมือง', 'พิมพ์ชนก ศรีสุข'], ['ทะเลหมอกยามเช้า', 'ธนกร วงศ์ใหญ่'],
  ['สีสันตลาดน้ำ', 'กมลวรรณ แก้วดี'], ['หอคอยกลางสายฝน', 'ณัฐวุฒิ ทองมา'],
  ['ทุ่งดอกไม้ปลายฝน', 'ศิริพร มั่นคง'], ['เงาสะท้อนบนผืนน้ำ', 'อนุชา บุญเรือง'],
  ['ราตรีนีออน', 'ปวีณา สายทอง'], ['ภูเขาสีลาเวนเดอร์', 'วรเมธ จันทร์เพ็ญ'],
  ['รอยยิ้มของชุมชน', 'ชลธิชา ประเสริฐ'], ['เส้นขอบฟ้าสีส้ม', 'ภาณุพงศ์ อินทร์แก้ว'],
  ['สวนลับกลางกรุง', 'มณีรัตน์ ศักดิ์ดี'], ['คลื่นแห่งความหวัง', 'กิตติศักดิ์ พรหมมา'],
]
const PALETTES = [
  ['#101426', '#7657FF', '#55C7FF', '#FF8D9C'], ['#1B2A4A', '#55C7FF', '#E9E5FF', '#7657FF'],
  ['#2A1446', '#FF8D9C', '#FFC7A1', '#7657FF'], ['#0E2233', '#3FE0C5', '#55C7FF', '#E9E5FF'],
  ['#25183F', '#B89CFF', '#FF8D9C', '#F8F9FF'], ['#0F1E2E', '#55C7FF', '#7657FF', '#FFD38A'],
]

const entries = SHAPES.map(([width, height], i) => ({
  id: `e${i + 1}`,
  title: TITLES[i][0],
  author: TITLES[i][1],
  description: 'ผลงานส่งเข้าประกวดในหัวข้อ “ช่วงเวลาร่วมกัน” ถ่ายทอดมุมมองของชุมชนผ่านแสง สี และความรู้สึก',
  image: `/mock-img/e${i + 1}.svg`,
  width,
  height,
}))
const counts = Object.fromEntries(entries.map((e, i) => [e.id, [42, 18, 77, 31, 12, 55, 64, 9, 38, 21, 47, 26][i]]))
const votesByUser = new Map()
const codes = new Map()
const sessions = new Map()

const campaign = {
  id: 'c-2026',
  title: 'ภาพแห่งช่วงเวลาร่วมกัน 2026',
  subtitle: 'ร่วมเลือกภาพที่เล่าเรื่อง “ช่วงเวลาร่วมกัน” ได้ดีที่สุด เลือกได้ 1 ผลงานต่อ 1 บัญชี LINE',
  endsAt: '2026-11-30T23:59:59+07:00',
  showCounts: true,
}

function art(id) {
  const i = Number(id.replace('e', '')) - 1
  const [w, h] = SHAPES[i] ?? [1200, 1200]
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

function userFrom(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  return sessions.get(token) || null
}

function authorizePage(q) {
  const back = (params) => `${q.get('redirect_uri')}?${new URLSearchParams({ ...params, state: q.get('state') || '' })}`
  const code = randomBytes(12).toString('hex')
  codes.set(code, { challenge: q.get('code_challenge'), redirectUri: q.get('redirect_uri') })
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mock LINE Login (dev)</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f2f3f5;font-family:system-ui,sans-serif;color:#111}
.c{width:min(360px,calc(100vw - 32px));background:#fff;border-radius:16px;padding:24px;box-shadow:0 8px 30px #0001}
.t{display:inline-block;background:#FFE7A3;color:#6b4e00;font-size:12px;font-weight:700;padding:4px 8px;border-radius:6px}
h1{font-size:18px;margin:14px 0 6px}p{font-size:14px;color:#555;line-height:1.5}
a{display:block;text-align:center;padding:13px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:10px}
.ok{background:#06C755;color:#fff}.no{background:#eee;color:#333}</style></head><body><div class="c">
<span class="t">DEV ONLY · ไม่ใช่ LINE จริง</span><h1>จำลองหน้าอนุญาตของ LINE</h1>
<p>หน้านี้มีเฉพาะตอนรัน <code>npm run dev</code> เพื่อทดสอบ OAuth round-trip ใน production ระบบจะพาไปที่ access.line.me</p>
<a class="ok" href="${back({ code })}">อนุญาต (ผู้ทดสอบ)</a>
<a class="no" href="${back({ error: 'access_denied', error_description: 'user cancelled' })}">ยกเลิก</a>
</div></body></html>`
}

export default function mockBackend() {
  return {
    name: 'vote-together-mock-backend',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const p = url.pathname

        if (p.startsWith('/mock-img/')) return send(res, 200, art(p.split('/').pop().replace('.svg', '')), 'image/svg+xml')
        if (p === '/mock-line/authorize') return send(res, 200, authorizePage(url.searchParams), 'text/html; charset=utf-8')
        if (!p.startsWith('/mock-api/')) return next()

        const route = `${req.method} ${p.replace('/mock-api', '')}`
        await wait(250 + Math.random() * 250)
        try {
          if (route === 'GET /campaign') return send(res, 200, campaign)
          if (route === 'GET /entries') {
            return send(res, 200, entries.map((e) => ({ ...e, votes: campaign.showCounts ? counts[e.id] : undefined })))
          }
          if (route === 'POST /auth/line') {
            const { code, codeVerifier, redirectUri } = await readJson(req)
            const issued = codes.get(code)
            codes.delete(code)
            const challenge = createHash('sha256').update(codeVerifier || '').digest('base64url')
            if (!issued || issued.challenge !== challenge || issued.redirectUri !== redirectUri) {
              return send(res, 401, { message: 'รหัสยืนยันจาก LINE ไม่ถูกต้องหรือหมดอายุ' })
            }
            const token = randomBytes(16).toString('hex')
            const user = { id: 'U-dev-tester', name: 'ผู้ทดสอบ (Dev)', avatar: '', role: 'admin' }
            sessions.set(token, user)
            return send(res, 200, { token, user })
          }
          const user = userFrom(req)
          if (!user) return send(res, 401, { message: 'กรุณาเข้าสู่ระบบด้วย LINE' })
          if (route === 'GET /me') return send(res, 200, { user, votedEntryId: votesByUser.get(user.id) ?? null })
          if (route === 'POST /auth/logout') {
            sessions.delete((req.headers.authorization || '').replace(/^Bearer /, ''))
            return send(res, 200, { ok: true })
          }
          if (route === 'POST /votes') {
            const { entryId } = await readJson(req)
            await wait(500)
            if (req.headers['x-mock-fail'] === '1') return send(res, 503, { message: 'ระบบบันทึกคะแนนไม่สำเร็จ กรุณาลองอีกครั้ง' })
            if (!counts[entryId]) return send(res, 404, { message: 'ไม่พบผลงานนี้' })
            if (votesByUser.has(user.id)) return send(res, 409, { message: 'บัญชีนี้โหวตไปแล้ว', votedEntryId: votesByUser.get(user.id) })
            votesByUser.set(user.id, entryId)
            counts[entryId] += 1
            return send(res, 201, { ok: true, entryId, votes: counts[entryId] })
          }
          if (route === 'GET /admin/stats') {
            if (user.role !== 'admin') return send(res, 403, { message: 'สำหรับผู้ดูแลระบบเท่านั้น' })
            const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0)
            return send(res, 200, {
              totalVotes,
              voters: totalVotes,
              updatedAt: new Date().toISOString(),
              entries: entries.map((e) => ({ id: e.id, title: e.title, author: e.author, image: e.image, votes: counts[e.id] })),
            })
          }
          return send(res, 404, { message: 'Not found' })
        } catch (err) {
          return send(res, 500, { message: String(err) })
        }
      })
    },
  }
}
