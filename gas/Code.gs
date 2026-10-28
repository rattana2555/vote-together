/**
 * VOTE TOGETHER API — Google Apps Script backend
 *
 * - เข้าสู่ระบบ: เว็บส่ง LINE ID token (จาก LIFF) มา → ยืนยันกับ LINE → ต้องมี userId อยู่ในแท็บ LINE_USERS
 * - ผลงาน: อ่านจากชีทกิจกรรม (เช่นชีทคำตอบ Google Form) ที่แอดมินตั้งไว้ เปลี่ยนชีทได้จากหน้าแดชบอร์ด
 * - คะแนน: เก็บในแท็บ VOTE_TOGETHER_VOTES ของชีทกิจกรรมนั้น (1 บัญชี LINE = 1 โหวต / กิจกรรม)
 * - รูป: ดึงผ่านสคริปต์นี้เท่านั้น (ไม่ต้องแชร์ไฟล์ใน Drive เป็นสาธารณะ) และให้เฉพาะคนที่ login แล้ว
 *
 * Deploy: Web app · Execute as: Me · Who has access: Anyone
 * ครั้งแรกหลัง push ให้กด Run ฟังก์ชัน setup() 1 ครั้งเพื่ออนุญาตสิทธิ์
 */

const VER = 'v1.3'

const USERS_SHEET_ID = '1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ'
const USERS_TAB = 'LINE_USERS'
const LINE_CHANNEL_ID = '2012261091' // LINE Login channel "VOTE TOGETHER" ใต้ provider HR (provider เดียวกับ LINE HR → userId ตรงกับ LINE_USERS)

// รหัสพนักงานที่เข้าแดชบอร์ดและเปลี่ยนชีทกิจกรรมได้
const ADMIN_EMP_IDS = []

const DEFAULT_EVENT = {
  sheetUrl: 'https://docs.google.com/spreadsheets/d/16Fc0BpnTPZnDXHYgXGgjOZaJSdVE6aCmCkJHMt2H49A/edit?gid=682041097',
  title: 'HALLOWEEN 2026 หลอนให้สุด แล้วหยุดที่ความปัง',
  subtitle: 'โหวตภาพชุดฮาโลวีนที่ปังที่สุด เลือกได้ 1 ภาพต่อ 1 บัญชี LINE',
  endsAt: '',
  showCounts: false,
}

const VOTES_TAB = 'VOTE_TOGETHER_VOTES'
const VOTES_HEADER = ['เวลา', 'LINE userId', 'รหัสพนักงาน', 'ชื่อผู้โหวต', 'รหัสผลงาน', 'ชื่อผลงาน']
const SESSION_HOURS = 72
const IMAGE_SIZES = { s: 's640', l: 's1600', a: 's200' }
const MAX_IMAGES_PER_CALL = 8

/* ───────────── entry points ───────────── */

function doGet() {
  return json({ ok: true, app: 'VOTE TOGETHER API', version: VER })
}

function doPost(e) {
  let body
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}')
  } catch (_) {
    return json(failure(400, 'BAD_REQUEST', 'รูปแบบคำขอไม่ถูกต้อง'))
  }
  try {
    const fn = ACTIONS[body.action]
    if (!fn) return json(failure(404, 'NOT_FOUND', 'ไม่รู้จักคำสั่งนี้'))
    return json(Object.assign({ ok: true, version: VER }, fn(body)))
  } catch (err) {
    if (err && err.vt) return json(err.vt)
    console.error(err && err.stack ? err.stack : err)
    return json(failure(500, 'SERVER_ERROR', 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่'))
  }
}

// รันครั้งเดียวจากหน้า Apps Script เพื่ออนุญาตสิทธิ์ (Sheets, Drive, เชื่อมต่อภายนอก)
function setup() {
  SpreadsheetApp.openById(USERS_SHEET_ID).getSheetByName(USERS_TAB).getLastRow()
  DriveApp.getRootFolder()
  UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify?access_token=x', { muteHttpExceptions: true })
  sessionSecret()
  const cfg = getConfig()
  console.log('OK · %s · ผู้ใช้ %s คน · ผลงาน %s ชิ้น', VER, Object.keys(getUsers()).length, readEntries(cfg).length)
}

const ACTIONS = {
  campaign: () => ({ campaign: publicCampaign(getConfig()) }),

  // ตัวเลขสรุปสำหรับเช็คว่าระบบอ่านชีท/รูปได้ (ไม่มีข้อมูลส่วนตัว)
  health: () => {
    const cfg = getConfig()
    const entries = readEntries(cfg)
    return {
      users: Object.keys(getUsers()).length,
      entries: entries.length,
      entriesWithSize: entries.filter((e) => e.width && e.height).length,
      votes: readVotes(cfg).length,
    }
  },

  login: (body) => {
    const uid = verifyLineIdToken(body.idToken)
    const u = getUsers()[uid]
    if (!u) {
      const raw = findRawUserRow(uid)
      const why = raw ? 'พบในชีทแต่สถานะคือ “' + (raw.status || 'ว่าง') + '”' : 'ไม่พบรหัสนี้ในแท็บ ' + USERS_TAB
      console.warn('login NOT_REGISTERED uid=%s %s', uid, why)
      throw vtError(
        403,
        'NOT_REGISTERED',
        'บัญชี LINE นี้ยังไม่ได้ลงทะเบียนพนักงาน กรุณาลงทะเบียนผ่าน LINE HR ก่อน (LINE ID ลงท้าย ' + uid.slice(-6) + ' · ' + why + ')',
      )
    }
    const exp = Date.now() + SESSION_HOURS * 3600 * 1000
    return {
      token: signSession({ uid: uid, exp: exp }),
      user: profile(u),
      votedEntryId: votedEntryOf(getConfig(), uid),
    }
  },

  me: (body) => {
    const u = requireUser(body)
    return { user: profile(u), votedEntryId: votedEntryOf(getConfig(), u.uid) }
  },

  entries: (body) => {
    const u = requireUser(body)
    const cfg = getConfig()
    const reveal = cfg.showCounts || isAdmin(u)
    const counts = reveal ? countVotes(readVotes(cfg)) : null
    return {
      entries: readEntries(cfg).map((e) => ({
        id: e.id,
        title: e.title,
        author: e.author,
        imageId: e.imageId,
        width: e.width,
        height: e.height,
        votes: counts ? counts[e.id] || 0 : undefined,
      })),
    }
  },

  images: (body) => {
    const u = requireUser(body)
    const size = IMAGE_SIZES[body.size] ? body.size : 's'
    const ids = (body.ids || []).map(String).slice(0, MAX_IMAGES_PER_CALL)
    const allowed = allowedImageIds(u)
    return { images: loadImages(ids.filter((id) => allowed[id]), size) }
  },

  vote: (body) => {
    const u = requireUser(body)
    const cfg = getConfig()
    if (isClosed(cfg)) throw vtError(403, 'CLOSED', 'ปิดรับโหวตแล้ว')
    const entry = readEntries(cfg).find((e) => e.id === String(body.entryId))
    if (!entry) throw vtError(404, 'ENTRY_NOT_FOUND', 'ไม่พบผลงานนี้ อาจถูกลบออกจากชีทแล้ว')

    const lock = LockService.getScriptLock()
    if (!lock.tryLock(20000)) throw vtError(503, 'BUSY', 'มีคนโหวตพร้อมกันจำนวนมาก กรุณาลองอีกครั้ง')
    try {
      const votes = readVotes(cfg)
      const mine = votes.find((v) => v.uid === u.uid)
      if (mine) throw vtError(409, 'ALREADY_VOTED', 'บัญชีนี้โหวตไปแล้ว', { votedEntryId: mine.entryId })
      const sh = votesSheet(cfg)
      const row = [nowText(), u.uid, u.empId, displayName(u), entry.id, entry.title]
      sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setNumberFormat('@').setValues([row])
      SpreadsheetApp.flush()
      const count = votes.filter((v) => v.entryId === entry.id).length + 1
      return { entryId: entry.id, votes: cfg.showCounts ? count : undefined }
    } finally {
      lock.releaseLock()
    }
  },

  stats: (body) => {
    requireAdmin(body)
    const cfg = getConfig()
    const votes = readVotes(cfg)
    const counts = countVotes(votes)
    return {
      totalVotes: votes.length,
      voters: Object.keys(votes.reduce((m, v) => ((m[v.uid] = 1), m), {})).length,
      eligible: Object.keys(getUsers()).length,
      updatedAt: new Date().toISOString(),
      entries: readEntries(cfg).map((e) => ({ id: e.id, title: e.title, author: e.author, imageId: e.imageId, votes: counts[e.id] || 0 })),
    }
  },

  getConfig: (body) => {
    requireAdmin(body)
    const cfg = getConfig()
    return { config: cfg, detected: describeEvent(cfg) }
  },

  saveConfig: (body) => {
    requireAdmin(body)
    const c = body.config || {}
    const next = {
      sheetUrl: String(c.sheetUrl || '').trim(),
      title: String(c.title || '').trim(),
      subtitle: String(c.subtitle || '').trim(),
      endsAt: String(c.endsAt || '').trim(),
      showCounts: Boolean(c.showCounts),
    }
    if (!parseSheetUrl(next.sheetUrl).id) throw vtError(400, 'BAD_SHEET', 'ลิงก์ชีทไม่ถูกต้อง ให้คัดลอกลิงก์จากแถบที่อยู่ของ Google Sheets')
    if (!next.title) throw vtError(400, 'BAD_TITLE', 'กรุณาใส่ชื่อกิจกรรม')
    if (next.endsAt && isNaN(new Date(next.endsAt).getTime())) throw vtError(400, 'BAD_DATE', 'วันปิดโหวตไม่ถูกต้อง')

    let detected
    try {
      detected = describeEvent(next)
    } catch (err) {
      if (err && err.vt) throw err
      throw vtError(400, 'SHEET_UNREADABLE', 'เปิดชีทนี้ไม่ได้ ตรวจว่าแชร์สิทธิ์แก้ไขให้บัญชีที่ดูแลสคริปต์แล้ว')
    }
    if (!detected.columns.image) throw vtError(400, 'NO_IMAGE_COLUMN', 'ไม่พบคอลัมน์ลิงก์รูปภาพจาก Google Drive ในแท็บนี้')
    PropertiesService.getScriptProperties().setProperty('CONFIG', JSON.stringify(next))
    CacheService.getScriptCache().remove(entriesCacheKey(next))
    return { config: next, detected: detected }
  },
}

/* ───────────── auth ───────────── */

function verifyLineIdToken(idToken) {
  if (!idToken) throw vtError(400, 'NO_TOKEN', 'ไม่พบข้อมูลยืนยันตัวตนจาก LINE')
  const res = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'post',
    payload: { id_token: String(idToken), client_id: LINE_CHANNEL_ID },
    muteHttpExceptions: true,
  })
  if (res.getResponseCode() !== 200) {
    throw vtError(401, 'LINE_VERIFY_FAILED', 'ยืนยันตัวตนกับ LINE ไม่สำเร็จ หรือหมดอายุ กรุณาเข้าสู่ระบบใหม่')
  }
  const data = JSON.parse(res.getContentText())
  return String(data.sub)
}

function sessionSecret() {
  const props = PropertiesService.getScriptProperties()
  let s = props.getProperty('SESSION_SECRET')
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid()
    props.setProperty('SESSION_SECRET', s)
  }
  return s
}

function hmac(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, sessionSecret()))
}

function signSession(payload) {
  const b = Utilities.base64EncodeWebSafe(JSON.stringify(payload), Utilities.Charset.UTF_8)
  return b + '.' + hmac(b)
}

function readSession(token) {
  const parts = String(token || '').split('.')
  if (parts.length !== 2 || hmac(parts[0]) !== parts[1]) return null
  try {
    const p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString('UTF-8'))
    return p.exp > Date.now() ? p : null
  } catch (_) {
    return null
  }
}

function requireUser(body) {
  const s = readSession(body.token)
  if (!s) throw vtError(401, 'SESSION_EXPIRED', 'กรุณาเข้าสู่ระบบด้วย LINE อีกครั้ง')
  const u = getUsers()[s.uid]
  if (!u) throw vtError(401, 'NOT_REGISTERED', 'บัญชี LINE นี้ไม่อยู่ในรายชื่อพนักงานแล้ว')
  return u
}

function requireAdmin(body) {
  const u = requireUser(body)
  if (!isAdmin(u)) throw vtError(403, 'FORBIDDEN', 'สำหรับผู้ดูแลกิจกรรมเท่านั้น')
  return u
}

const isAdmin = (u) => ADMIN_EMP_IDS.indexOf(String(u.empId)) !== -1

/* ───────────── users (LINE_USERS) ───────────── */

function getUsers() {
  const cache = CacheService.getScriptCache()
  const hit = cache.get('users')
  if (hit) return JSON.parse(hit)
  const sh = SpreadsheetApp.openById(USERS_SHEET_ID).getSheetByName(USERS_TAB)
  const values = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 14).getDisplayValues()
  const users = {}
  values.forEach((r) => {
    const uid = String(r[0]).trim()
    if (!/^U[0-9a-f]{32}$/.test(uid)) return
    if (String(r[8]).indexOf('ลงทะเบียนแล้ว') === -1) return
    users[uid] = {
      uid: uid,
      empId: String(r[1]).trim(),
      name: cleanSpaces(r[2]),
      nick: cleanSpaces(r[3]),
      branch: cleanSpaces(r[4]),
      dept: cleanSpaces(r[5]),
      photoId: driveId(r[13]),
    }
  })
  cache.put('users', JSON.stringify(users), 600)
  return users
}

// อ่านแถวตรง ๆ ไม่ผ่านตัวกรองสถานะ ใช้อธิบายว่าทำไมเข้าไม่ได้
function findRawUserRow(uid) {
  const sh = SpreadsheetApp.openById(USERS_SHEET_ID).getSheetByName(USERS_TAB)
  const values = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 9).getDisplayValues()
  const row = values.find((r) => String(r[0]).trim() === uid)
  return row ? { status: cleanSpaces(row[8]) } : null
}

function profile(u) {
  return {
    id: u.uid,
    empId: u.empId,
    name: u.name,
    nick: u.nick,
    display: displayName(u),
    branch: u.branch,
    dept: u.dept,
    avatarId: u.photoId || '',
    role: isAdmin(u) ? 'admin' : 'voter',
  }
}

// ชื่อเล่นห้ามโชว์เดี่ยว ต้องต่อท้ายชื่อจริงในวงเล็บเสมอ
function displayName(u) {
  if (u.name && u.nick) return u.name + ' (' + u.nick + ')'
  return u.name || u.nick || ''
}

/* ───────────── event sheet ───────────── */

function getConfig() {
  const raw = PropertiesService.getScriptProperties().getProperty('CONFIG')
  return raw ? JSON.parse(raw) : DEFAULT_EVENT
}

function publicCampaign(cfg) {
  return {
    id: parseSheetUrl(cfg.sheetUrl).id,
    title: cfg.title,
    subtitle: cfg.subtitle,
    endsAt: cfg.endsAt || null,
    showCounts: Boolean(cfg.showCounts),
    closed: isClosed(cfg),
  }
}

const isClosed = (cfg) => Boolean(cfg.endsAt) && Date.now() > new Date(cfg.endsAt).getTime()

function parseSheetUrl(url) {
  const id = (String(url).match(/\/d\/([-\w]{20,})/) || [])[1] || ''
  const gid = (String(url).match(/[#&?]gid=(\d+)/) || [])[1] || ''
  return { id: id, gid: gid }
}

function eventSheet(cfg) {
  const p = parseSheetUrl(cfg.sheetUrl)
  const ss = SpreadsheetApp.openById(p.id)
  const sheets = ss.getSheets()
  const sh = (p.gid && sheets.find((s) => String(s.getSheetId()) === p.gid)) || sheets.find((s) => s.getName() !== VOTES_TAB)
  return { ss: ss, sh: sh }
}

function detectColumns(header, rows) {
  const h = header.map((x) => String(x).toLowerCase())
  const find = (re, skip) => h.findIndex((x, i) => re.test(x) && (skip || []).indexOf(i) === -1)
  const cols = {}
  cols.nick = find(/ชื่อเล่น|nickname/)
  cols.fullName = find(/ชื่อจริง|ชื่อ\s*-?\s*สกุล|ชื่อ-นามสกุล|full\s*name/, [cols.nick])
  cols.title = find(/ชื่อภาพ|ชื่อผลงาน|สโลแกน|แคปชั่น|caption|title/, [cols.nick, cols.fullName])
  cols.image = h.findIndex((_, i) => rows.some((r) => driveId(r[i])) && [cols.title].indexOf(i) === -1)
  return {
    nick: cols.nick >= 0 ? header[cols.nick] : null,
    fullName: cols.fullName >= 0 ? header[cols.fullName] : null,
    title: cols.title >= 0 ? header[cols.title] : null,
    image: cols.image >= 0 ? header[cols.image] : null,
    _idx: cols,
  }
}

function describeEvent(cfg) {
  const t = eventSheet(cfg)
  const values = t.sh.getDataRange().getDisplayValues()
  const cols = detectColumns(values[0] || [], values.slice(1))
  const count = values.slice(1).filter((r) => cols._idx.image >= 0 && driveId(r[cols._idx.image])).length
  delete cols._idx
  return { spreadsheet: t.ss.getName(), tab: t.sh.getName(), entryCount: count, columns: cols }
}

const entriesCacheKey = (cfg) => 'entries:' + Utilities.base64EncodeWebSafe(cfg.sheetUrl).slice(-60)

function readEntries(cfg) {
  const cache = CacheService.getScriptCache()
  const key = entriesCacheKey(cfg)
  const hit = cache.get(key)
  if (hit) return JSON.parse(hit)

  const values = eventSheet(cfg).sh.getDataRange().getDisplayValues()
  const rows = values.slice(1)
  const idx = detectColumns(values[0] || [], rows)._idx
  const seen = {}
  const entries = []
  rows.forEach((r, i) => {
    const imageId = idx.image >= 0 ? driveId(r[idx.image]) : ''
    if (!imageId || seen[imageId]) return
    seen[imageId] = 1
    const name = idx.fullName >= 0 ? cleanSpaces(r[idx.fullName]) : ''
    const nick = idx.nick >= 0 ? cleanSpaces(r[idx.nick]) : ''
    entries.push({
      id: imageId,
      title: (idx.title >= 0 ? cleanSpaces(r[idx.title]) : '') || 'ผลงานที่ ' + (i + 1),
      author: displayName({ name: name, nick: nick }),
      imageId: imageId,
    })
  })

  const meta = driveMeta(entries.map((e) => e.imageId))
  entries.forEach((e) => {
    const m = meta[e.imageId] || {}
    e.width = m.w || null
    e.height = m.h || null
  })
  cache.put(key, JSON.stringify(entries), 120)
  return entries
}

function votesSheet(cfg) {
  const ss = eventSheet(cfg).ss
  let sh = ss.getSheetByName(VOTES_TAB)
  if (!sh) {
    sh = ss.insertSheet(VOTES_TAB)
    sh.getRange(1, 1, 1, VOTES_HEADER.length).setNumberFormat('@').setValues([VOTES_HEADER]).setFontWeight('bold')
    sh.setFrozenRows(1)
  }
  return sh
}

function readVotes(cfg) {
  const sh = eventSheet(cfg).ss.getSheetByName(VOTES_TAB)
  if (!sh || sh.getLastRow() < 2) return []
  return sh
    .getRange(2, 1, sh.getLastRow() - 1, VOTES_HEADER.length)
    .getDisplayValues()
    .filter((r) => r[1])
    .map((r) => ({ time: r[0], uid: r[1], empId: r[2], name: r[3], entryId: r[4], title: r[5] }))
}

function votedEntryOf(cfg, uid) {
  const v = readVotes(cfg).find((x) => x.uid === uid)
  return v ? v.entryId : null
}

function countVotes(votes) {
  return votes.reduce((m, v) => ((m[v.entryId] = (m[v.entryId] || 0) + 1), m), {})
}

/* ───────────── Drive images (served only through this script) ───────────── */

function allowedImageIds(u) {
  const ids = {}
  readEntries(getConfig()).forEach((e) => (ids[e.imageId] = 1))
  if (u.photoId) ids[u.photoId] = 1
  return ids
}

function driveApi(path) {
  return {
    url: 'https://www.googleapis.com/drive/v3/' + path,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  }
}

function driveMeta(ids) {
  const cache = CacheService.getScriptCache()
  const out = {}
  const hits = cache.getAll(ids.map((id) => 'meta:' + id))
  const missing = []
  ids.forEach((id) => {
    const h = hits['meta:' + id]
    if (h) out[id] = JSON.parse(h)
    else missing.push(id)
  })
  for (let i = 0; i < missing.length; i += 25) {
    const batch = missing.slice(i, i + 25)
    const res = UrlFetchApp.fetchAll(
      batch.map((id) => driveApi('files/' + id + '?supportsAllDrives=true&fields=thumbnailLink,imageMediaMetadata(width,height,rotation)')),
    )
    const toCache = {}
    res.forEach((r, k) => {
      if (r.getResponseCode() !== 200) return
      const d = JSON.parse(r.getContentText())
      const im = d.imageMediaMetadata || {}
      const turned = im.rotation === 1 || im.rotation === 3
      out[batch[k]] = { w: turned ? im.height : im.width, h: turned ? im.width : im.height, thumb: d.thumbnailLink || '' }
      toCache['meta:' + batch[k]] = JSON.stringify({ w: out[batch[k]].w, h: out[batch[k]].h })
    })
    cache.putAll(toCache, 21600)
  }
  return out
}

function loadImages(ids, size) {
  const out = {}
  const missing = []
  ids.forEach((id) => {
    const hit = getChunks('img:' + size + ':' + id)
    if (hit) out[id] = hit
    else missing.push(id)
  })
  if (!missing.length) return out

  const links = UrlFetchApp.fetchAll(missing.map((id) => driveApi('files/' + id + '?supportsAllDrives=true&fields=thumbnailLink')))
  const want = []
  links.forEach((r, k) => {
    if (r.getResponseCode() !== 200) return
    const link = JSON.parse(r.getContentText()).thumbnailLink
    if (link) want.push({ id: missing[k], url: link.replace(/=s\d+$/, '=' + IMAGE_SIZES[size]) })
  })
  const blobs = UrlFetchApp.fetchAll(
    want.map((w) => ({ url: w.url, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true })),
  )
  blobs.forEach((r, k) => {
    if (r.getResponseCode() !== 200) return
    const blob = r.getBlob()
    const dataUrl = 'data:' + (blob.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(blob.getBytes())
    out[want[k].id] = dataUrl
    putChunks('img:' + size + ':' + want[k].id, dataUrl, 21600)
  })
  return out
}

// CacheService เก็บได้ค่าละไม่เกิน 100KB จึงแบ่งเป็นท่อน
function putChunks(key, text, ttl) {
  const size = 90000
  const parts = {}
  const n = Math.ceil(text.length / size)
  for (let i = 0; i < n; i++) parts[key + ':' + i] = text.slice(i * size, (i + 1) * size)
  parts[key + ':n'] = String(n)
  try {
    CacheService.getScriptCache().putAll(parts, ttl)
  } catch (_) {
    /* cache full: serve uncached */
  }
}

function getChunks(key) {
  const cache = CacheService.getScriptCache()
  const n = Number(cache.get(key + ':n') || 0)
  if (!n) return null
  const keys = []
  for (let i = 0; i < n; i++) keys.push(key + ':' + i)
  const got = cache.getAll(keys)
  if (Object.keys(got).length !== n) return null
  return keys.map((k) => got[k]).join('')
}

/* ───────────── helpers ───────────── */

function driveId(v) {
  const s = String(v || '')
  const m = s.match(/[?&]id=([-\w]{20,})/) || s.match(/\/d\/([-\w]{20,})/)
  return m ? m[1] : ''
}

function cleanSpaces(v) {
  return String(v || '').replace(/\s+/g, ' ').trim()
}

function nowText() {
  return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss')
}

function failure(status, code, message, extra) {
  return Object.assign({ ok: false, status: status, code: code, message: message }, extra || {})
}

function vtError(status, code, message, extra) {
  return { vt: failure(status, code, message, extra) }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
