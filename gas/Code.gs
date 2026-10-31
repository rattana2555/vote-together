/**
 * VOTE TOGETHER API — Google Apps Script backend
 *
 * - เข้าสู่ระบบ: เว็บส่ง LINE ID token (จาก LIFF) มา → ยืนยันกับ LINE → จับคู่กับพนักงานในแท็บ LINE_USERS
 * - กิจกรรม: แอดมินสร้างได้หลายกิจกรรมในแอป แต่ละกิจกรรมเลือกแหล่งผลงานได้ 2 แบบ
 *     · 'app'   อัปโหลดรูปผ่านแอป (ไฟล์อยู่ในโฟลเดอร์ VOTE TOGETHER Uploads · ข้อมูลอยู่ในชีท VOTE TOGETHER Data)
 *     · 'sheet' ดึงจากชีทคำตอบ Google Form (คะแนนเก็บในแท็บ VOTE_TOGETHER_VOTES ของชีทนั้น)
 *     · 'form'  แบบสอบถาม/โพลที่สร้างคำถามเองในแอป (คำถามอยู่แท็บ QUESTIONS · คำตอบอยู่แท็บ RESPONSES)
 *   แสดงในหน้าโหวตได้พร้อมกันหลายกิจกรรม (คอลัมน์ 'แสดงในหน้าโหวต') · 1 บัญชี LINE = 1 โหวต/คำตอบ ต่อกิจกรรม
 * - รูป: ดึงผ่านสคริปต์นี้เท่านั้น (ไม่ต้องแชร์ไฟล์ใน Drive เป็นสาธารณะ) และให้เฉพาะคนที่ login แล้ว
 *
 * Deploy: Web app · Execute as: Me · Who has access: Anyone
 * ครั้งแรกหลัง push ให้กด Run ฟังก์ชัน setup() 1 ครั้งเพื่ออนุญาตสิทธิ์
 */

const VER = 'v3.8'

const USERS_SHEET_ID = '1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ'
const USERS_TAB = 'LINE_USERS'
const LINE_CHANNEL_ID = '2012261091' // LINE Login channel "VOTE TOGETHER" (provider HR)

// แอดมินตั้งต้น (เพิ่ม/ลบคนอื่นได้ในแอป หน้าแดชบอร์ด → ผู้ดูแล)
const SEED_ADMIN_EMP_IDS = ['68030']

const DEFAULT_EVENT = {
  sheetUrl: 'https://docs.google.com/spreadsheets/d/16Fc0BpnTPZnDXHYgXGgjOZaJSdVE6aCmCkJHMt2H49A/edit?gid=682041097',
  title: 'HALLOWEEN 2026 หลอนให้สุด แล้วหยุดที่ความปัง',
  subtitle: 'โหวตภาพชุดฮาโลวีนที่ปังที่สุด เลือกได้ 1 ภาพต่อ 1 บัญชี LINE',
  endsAt: '',
  showCounts: false,
}

const VOTES_TAB = 'VOTE_TOGETHER_VOTES'
const VOTES_HEADER = ['เวลา', 'LINE userId', 'รหัสพนักงาน', 'ชื่อผู้โหวต', 'รหัสผลงาน', 'ชื่อผลงาน']

const DATA_TABS = {
  CAMPAIGNS: ['รหัสกิจกรรม', 'ชื่อกิจกรรม', 'คำโปรย', 'ปิดโหวต', 'โชว์คะแนน', 'แหล่งผลงาน', 'ลิงก์ชีท', 'สร้างเมื่อ', 'สร้างโดย', 'แสดงในหน้าโหวต', 'ลบแล้ว'],
  ENTRIES: ['รหัสกิจกรรม', 'รหัสผลงาน', 'ชื่อผลงาน', 'เจ้าของผลงาน', 'รหัสรูป', 'กว้าง', 'สูง', 'เพิ่มเมื่อ', 'เพิ่มโดย'],
  VOTES: ['รหัสกิจกรรม'].concat(VOTES_HEADER),
  ACCESS: ['LINE sub (แอปโหวต)', 'ชื่อ LINE', 'รูป LINE', 'รหัสพนักงานที่แจ้ง', 'สถานะ', 'ขอเมื่อ', 'จัดการโดย', 'จัดการเมื่อ'],
  QUESTIONS: ['รหัสกิจกรรม', 'รหัสคำถาม', 'ลำดับ', 'ประเภท', 'คำถาม', 'ข้อมูล (JSON)'],
  RESPONSES: ['รหัสกิจกรรม', 'เวลา', 'LINE userId', 'รหัสพนักงาน', 'ชื่อผู้ตอบ', 'คำตอบ (JSON)', 'คำตอบ (อ่านง่าย)'],
}
const QUESTION_TYPES = ['single', 'multi', 'text', 'rating']
// ผู้โหวตเห็นผลเมื่อไหร่: never ไม่ให้เห็น · always ตลอดเวลา · afterVote หลังโหวต/ตอบแล้ว · afterClose หลังปิดโหวต
const RESULT_MODES = ['never', 'always', 'afterVote', 'afterClose']
const LIVE_CACHE_SECONDS = 15
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
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
  dataBook()
  console.log('OK · %s · ผู้ใช้ %s คน · กิจกรรม %s รายการ', VER, Object.keys(getUsers()).length, listCampaigns().length)
}

const ACTIONS = {
  // หน้าแรก: รายการกิจกรรมที่แสดงอยู่ (ถ้า login แล้วบอกด้วยว่าเข้าร่วมแล้วหรือยัง)
  openCampaigns: (body) => {
    const s = readSession(body.token)
    const u = s && getUsers()[s.uid]
    return {
      campaigns: listCampaigns()
        .filter((c) => c.published)
        .map((c) => Object.assign(publicCampaign(c), { done: u ? hasParticipated(c, u.uid) : null })),
    }
  },

  campaign: (body) => {
    const s = readSession(body.token)
    return { campaign: publicCampaign(voterCampaign(body, s && getUsers()[s.uid])) }
  },

  // ตัวเลขสรุปสำหรับเช็คว่าระบบอ่านชีท/รูปได้ (ไม่มีข้อมูลส่วนตัว)
  health: () => {
    const list = listCampaigns()
    return {
      users: Object.keys(getUsers()).length,
      campaigns: list.length,
      published: list.filter((c) => c.published).length,
    }
  },

  login: (body) => {
    const line = verifyLineIdToken(body.idToken)
    let u = findEmployee(line)
    if (!u) {
      // อาจเพิ่งลงทะเบียนกับ LINE HR: อ่านรายชื่อจากชีทใหม่ ไม่ใช้ที่จำไว้
      CacheService.getScriptCache().remove('users2')
      u = findEmployee(line)
    }
    if (u) return sessionFor(u, line.picture)
    console.warn('login not matched sub=%s name=%s', line.sub, line.name)
    const req = recordAccessRequest(line)
    throw vtError(
      403,
      'NOT_REGISTERED',
      'บัญชี LINE “' + line.name + '” ยังไม่ได้ลงทะเบียนพนักงาน หรือระบบจับคู่กับรายชื่อไม่ได้ (เช่นเปลี่ยนรูปหรือชื่อ LINE หลังลงทะเบียน)',
      {
        lineHrUrl: lineHrLink(),
        requestToken: signSession({ req: line.sub, exp: Date.now() + 2 * 24 * 3600 * 1000 }),
        requested: Boolean(req.empId),
        lineName: line.name,
      },
    )
  },

  // คนที่ลงทะเบียน LINE HR แล้วแต่ระบบจับคู่ไม่ได้: แจ้งรหัสพนักงานให้แอดมินยืนยัน
  requestAccess: (body) => {
    const t = readSession(body.requestToken)
    if (!t || !t.req) throw vtError(401, 'REQUEST_EXPIRED', 'คำขอหมดอายุ กรุณากดเข้าสู่ระบบด้วย LINE อีกครั้ง')
    const empId = String(body.empId || '').trim()
    if (!/^[\w-]{1,20}$/.test(empId)) throw vtError(400, 'BAD_EMP', 'กรุณาใส่รหัสพนักงาน')
    const row = accessRow(t.req)
    if (!row) throw vtError(404, 'REQUEST_NOT_FOUND', 'ไม่พบคำขอ กรุณากดเข้าสู่ระบบด้วย LINE อีกครั้ง')
    row.sheet.getRange(row.index, 4, 1, 3).setNumberFormat('@').setValues([[empId, 'รอยืนยัน', nowText()]])
    return { requested: true }
  },

  me: (body) => {
    const u = requireUser(body)
    const s = readSession(body.token)
    return { user: profile(u, s && s.pic) }
  },

  /* ── แบบสอบถาม/โพล ── */

  form: (body) => {
    const u = requireUser(body)
    const cfg = voterCampaign(body, u)
    if (cfg.source !== 'form') return { questions: [], myAnswers: null, results: null }
    const qs = readQuestions(cfg)
    const all = readResponses(cfg)
    const mine = all.find((r) => r.uid === u.uid)
    return {
      questions: qs,
      myAnswers: mine ? mine.answers : null,
      results: resultsVisible(cfg, u, Boolean(mine)) ? aggregate(qs, all, false) : null,
    }
  },

  submitResponse: (body) => {
    const u = requireUser(body)
    const cfg = voterCampaign(body, u)
    if (cfg.source !== 'form') throw vtError(400, 'NOT_FORM', 'กิจกรรมนี้ไม่ใช่แบบสอบถาม')
    if (isClosed(cfg)) throw vtError(403, 'CLOSED', 'ปิดรับคำตอบแล้ว')
    const qs = readQuestions(cfg)
    const answers = cleanAnswers(qs, body.answers || {})
    const lock = LockService.getScriptLock()
    if (!lock.tryLock(20000)) throw vtError(503, 'BUSY', 'มีคนส่งคำตอบพร้อมกันจำนวนมาก กรุณาลองอีกครั้ง')
    try {
      if (readResponses(cfg).some((r) => r.uid === u.uid)) throw vtError(409, 'ALREADY_ANSWERED', 'บัญชีนี้ส่งคำตอบไปแล้ว')
      appendDataRow('RESPONSES', [cfg.id, nowText(), u.uid, u.empId, displayName(u), JSON.stringify(answers), readableAnswers(qs, answers)])
      CacheService.getScriptCache().remove('live:' + cfg.id)
      return { answers: answers, results: resultsVisible(cfg, u, true) ? aggregate(qs, readResponses(cfg), false) : null }
    } finally {
      lock.releaseLock()
    }
  },

  entries: (body) => {
    const u = requireUser(body)
    const cfg = voterCampaign(body, u)
    const votes = readVotes(cfg)
    const mine = votes.find((v) => v.uid === u.uid)
    const counts = resultsVisible(cfg, u, Boolean(mine)) ? countVotes(votes) : null
    return {
      votedEntryId: mine ? mine.entryId : null,
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

  // ผลสดสำหรับผู้โหวต (หน้าเว็บถามซ้ำทุก ~20 วินาที · ผลรวมจำไว้ 15 วินาทีเพื่อไม่ให้อ่านชีททุกครั้ง)
  results: (body) => {
    const u = requireUser(body)
    const cfg = voterCampaign(body, u)
    const done = hasParticipated(cfg, u.uid)
    const visible = resultsVisible(cfg, u, done)
    return { mode: cfg.resultsMode, visible: visible, done: done, updatedAt: new Date().toISOString(), data: visible ? liveResults(cfg) : null }
  },

  // ตรวจว่ารูปของกิจกรรมที่แสดงอยู่พร้อมให้ดึงไหม (ไม่มีข้อมูลส่วนตัว: แค่ชนิดไฟล์ ขนาด และมีรูปย่อหรือยัง)
  imageHealth: () => {
    const ids = []
    listCampaigns()
      .filter((c) => c.published)
      .forEach((c) => readEntries(c).forEach((e) => ids.push(e.imageId)))
    const res = UrlFetchApp.fetchAll(ids.map((id) => driveApi('files/' + id + '?supportsAllDrives=true&fields=mimeType,size,thumbnailLink')))
    return {
      images: res.map((r, i) => {
        const d = r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) : {}
        return { ref: ids[i].slice(-5), status: r.getResponseCode(), mime: d.mimeType || '', kb: Math.round(Number(d.size || 0) / 1024), thumbnail: Boolean(d.thumbnailLink) }
      }),
    }
  },

  images: (body) => {
    const u = requireUser(body)
    const size = IMAGE_SIZES[body.size] ? body.size : 's'
    const ids = (body.ids || []).map(String).slice(0, MAX_IMAGES_PER_CALL)
    const allowed = allowedImageIds(u, body.campaignId)
    return { images: loadImages(ids.filter((id) => allowed[id]), size) }
  },

  vote: (body) => {
    const u = requireUser(body)
    const cfg = voterCampaign(body, u)
    if (isClosed(cfg)) throw vtError(403, 'CLOSED', 'ปิดรับโหวตแล้ว')
    const entry = readEntries(cfg).find((e) => e.id === String(body.entryId))
    if (!entry) throw vtError(404, 'ENTRY_NOT_FOUND', 'ไม่พบผลงานนี้ อาจถูกลบออกไปแล้ว')

    const lock = LockService.getScriptLock()
    if (!lock.tryLock(20000)) throw vtError(503, 'BUSY', 'มีคนโหวตพร้อมกันจำนวนมาก กรุณาลองอีกครั้ง')
    try {
      const votes = readVotes(cfg)
      const mine = votes.find((v) => v.uid === u.uid)
      if (mine) throw vtError(409, 'ALREADY_VOTED', 'บัญชีนี้โหวตไปแล้ว', { votedEntryId: mine.entryId })
      appendVote(cfg, [nowText(), u.uid, u.empId, displayName(u), entry.id, entry.title])
      const count = votes.filter((v) => v.entryId === entry.id).length + 1
      CacheService.getScriptCache().remove('live:' + cfg.id)
      return { entryId: entry.id, votes: resultsVisible(cfg, u, true) ? count : undefined }
    } finally {
      lock.releaseLock()
    }
  },

  /* ── แอดมิน ── */

  stats: (body) => {
    requireAdmin(body)
    const cfg = campaignById(body.campaignId)
    const votes = readVotes(cfg)
    const counts = countVotes(votes)
    return {
      campaign: publicCampaign(cfg),
      totalVotes: votes.length,
      voters: Object.keys(votes.reduce((m, v) => ((m[v.uid] = 1), m), {})).length,
      eligible: Object.keys(getUsers()).length,
      updatedAt: new Date().toISOString(),
      entries: readEntries(cfg).map((e) => ({ id: e.id, title: e.title, author: e.author, imageId: e.imageId, votes: counts[e.id] || 0 })),
    }
  },

  campaigns: (body) => {
    requireAdmin(body)
    return { campaigns: listCampaigns().map((c) => Object.assign({}, c, { closed: isClosed(c) })) }
  },

  campaignEntries: (body) => {
    requireAdmin(body)
    const cfg = campaignById(body.campaignId)
    const counts = countVotes(readVotes(cfg))
    return {
      entries: readEntries(cfg).map((e) => Object.assign({}, e, { votes: counts[e.id] || 0 })),
      detected: cfg.source === 'sheet' ? describeEvent(cfg) : null,
    }
  },

  saveCampaign: (body) => {
    const admin = requireAdmin(body)
    const c = body.campaign || {}
    const prev = c.id ? campaignById(c.id) : null
    const next = {
      id: prev ? prev.id : newId('c'),
      title: String(c.title || '').trim(),
      subtitle: String(c.subtitle || '').trim(),
      endsAt: String(c.endsAt || '').trim(),
      resultsMode: RESULT_MODES.indexOf(c.resultsMode) !== -1 ? c.resultsMode : c.showCounts ? 'always' : 'never',
      source: ['sheet', 'form'].indexOf(c.source) !== -1 ? c.source : 'app',
      sheetUrl: c.source === 'sheet' ? String(c.sheetUrl || '').trim() : '',
      createdAt: prev ? prev.createdAt : nowText(),
      createdBy: prev ? prev.createdBy : displayName(admin),
      published: prev ? prev.published : false,
    }
    if (!next.title) throw vtError(400, 'BAD_TITLE', 'กรุณาใส่ชื่อกิจกรรม')
    if (next.endsAt && isNaN(new Date(next.endsAt).getTime())) throw vtError(400, 'BAD_DATE', 'วันปิดโหวตไม่ถูกต้อง')
    if (prev && (prev.source !== next.source || prev.sheetUrl !== next.sheetUrl) && (readVotes(prev).length || readResponses(prev).length)) {
      throw vtError(409, 'HAS_VOTES', 'กิจกรรมนี้มีคนโหวต/ตอบแล้ว เปลี่ยนประเภทไม่ได้ ให้สร้างกิจกรรมใหม่แทน')
    }

    let detected = null
    if (next.source === 'sheet') {
      if (!parseSheetUrl(next.sheetUrl).id) throw vtError(400, 'BAD_SHEET', 'ลิงก์ชีทไม่ถูกต้อง ให้คัดลอกลิงก์จากแถบที่อยู่ของ Google Sheets')
      try {
        detected = describeEvent(next)
      } catch (err) {
        if (err && err.vt) throw err
        throw vtError(400, 'SHEET_UNREADABLE', 'เปิดชีทนี้ไม่ได้ ตรวจว่าแชร์สิทธิ์แก้ไขให้บัญชีที่ดูแลสคริปต์แล้ว')
      }
      if (!detected.columns.image) throw vtError(400, 'NO_IMAGE_COLUMN', 'ไม่พบคอลัมน์ลิงก์รูปภาพจาก Google Drive ในแท็บนี้')
    }
    next.showCounts = next.resultsMode === 'always'
    writeCampaign(next)
    clearEntriesCache(next)
    return { campaign: next, detected: detected }
  },

  // ลบออกจากแอป แต่แถวข้อมูล คะแนน คำตอบ และรูปยังอยู่ในชีท/Drive (กู้คืน: ลบคำว่า yes ในคอลัมน์ 'ลบแล้ว')
  deleteCampaign: (body) => {
    requireAdmin(body)
    const cfg = campaignById(body.campaignId)
    writeCampaign(Object.assign({}, cfg, { published: false, deleted: true }))
    return { campaignId: cfg.id }
  },

  setResultsMode: (body) => {
    requireAdmin(body)
    const cfg = campaignById(body.campaignId)
    if (RESULT_MODES.indexOf(body.mode) === -1) throw vtError(400, 'BAD_MODE', 'โหมดการแสดงผลไม่ถูกต้อง')
    writeCampaign(Object.assign({}, cfg, { resultsMode: body.mode, showCounts: body.mode === 'always' }))
    return { campaign: publicCampaign(campaignById(cfg.id)) }
  },

  setPublished: (body) => {
    requireAdmin(body)
    const cfg = campaignById(body.campaignId)
    writeCampaign(Object.assign({}, cfg, { published: Boolean(body.published) }))
    return { campaign: publicCampaign(campaignById(cfg.id)) }
  },

  addEntry: (body) => {
    const admin = requireAdmin(body)
    const cfg = campaignById(body.campaignId)
    if (cfg.source !== 'app') throw vtError(400, 'WRONG_SOURCE', 'กิจกรรมนี้ดึงผลงานจากชีท เพิ่มรูปในแอปไม่ได้')
    const title = cleanSpaces(body.title)
    const author = cleanSpaces(body.author)
    if (!title) throw vtError(400, 'BAD_TITLE', 'กรุณาใส่ชื่อผลงาน')
    if (!author) throw vtError(400, 'BAD_AUTHOR', 'กรุณาใส่ชื่อเจ้าของผลงาน')

    const file = saveUpload(cfg, body.image)

    const entry = {
      id: file.getId(),
      title: title,
      author: author,
      imageId: file.getId(),
      width: Number(body.width) || null,
      height: Number(body.height) || null,
    }
    appendDataRow('ENTRIES', [cfg.id, entry.id, entry.title, entry.author, entry.imageId, String(entry.width || ''), String(entry.height || ''), nowText(), displayName(admin)])
    clearEntriesCache(cfg)
    return { entry: Object.assign({ votes: 0 }, entry) }
  },

  deleteEntry: (body) => {
    requireAdmin(body)
    const cfg = campaignById(body.campaignId)
    if (cfg.source !== 'app') throw vtError(400, 'WRONG_SOURCE', 'ผลงานของกิจกรรมนี้อยู่ในชีท ให้ลบที่ชีทแทน')
    const entryId = String(body.entryId)
    if (readVotes(cfg).some((v) => v.entryId === entryId)) throw vtError(409, 'HAS_VOTES', 'ผลงานนี้มีคนโหวตแล้ว ลบไม่ได้')
    const sh = dataBook().getSheetByName('ENTRIES')
    const rows = sh.getDataRange().getDisplayValues()
    const i = rows.findIndex((r, k) => k > 0 && r[0] === cfg.id && r[1] === entryId)
    if (i < 1) throw vtError(404, 'ENTRY_NOT_FOUND', 'ไม่พบผลงานนี้')
    sh.deleteRow(i + 1)
    try {
      DriveApp.getFileById(rows[i][4]).setTrashed(true)
    } catch (_) {
      /* file already gone */
    }
    clearEntriesCache(cfg)
    return { entryId: entryId }
  },

  campaignQuestions: (body) => {
    requireAdmin(body)
    const cfg = campaignById(body.campaignId)
    return { questions: readQuestions(cfg), responses: readResponses(cfg).length }
  },

  saveQuestions: (body) => {
    requireAdmin(body)
    const cfg = campaignById(body.campaignId)
    if (cfg.source !== 'form') throw vtError(400, 'NOT_FORM', 'กิจกรรมนี้ไม่ใช่แบบสอบถาม')
    if (readResponses(cfg).length) throw vtError(409, 'HAS_RESPONSES', 'มีคนตอบแล้ว แก้คำถามไม่ได้ ให้สร้างกิจกรรมใหม่แทน')
    const qs = cleanQuestions(body.questions)
    writeQuestions(cfg, qs)
    return { questions: qs }
  },

  uploadImage: (body) => {
    requireAdmin(body)
    const cfg = campaignById(body.campaignId)
    const file = saveUpload(cfg, body.image)
    return { imageId: file.getId(), width: Number(body.width) || null, height: Number(body.height) || null }
  },

  formResults: (body) => {
    requireAdmin(body)
    const cfg = campaignById(body.campaignId)
    const qs = readQuestions(cfg)
    return Object.assign(
      { campaign: publicCampaign(cfg), eligible: Object.keys(getUsers()).length, updatedAt: new Date().toISOString() },
      aggregate(qs, readResponses(cfg), true),
    )
  },

  // ลิงก์เปิดแชท LINE HR (ใช้แสดงปุ่มให้คนที่ยังไม่ลงทะเบียน · ไม่ได้แตะตั้งค่าใด ๆ ของ LINE HR)
  getLineHrLink: (body) => {
    requireAdmin(body)
    return { value: PropertiesService.getScriptProperties().getProperty('HR_LINK') || '', url: lineHrLink() }
  },

  saveLineHrLink: (body) => {
    requireAdmin(body)
    const v = String(body.value || '').trim()
    if (v && !/^@[\w.\-]+$/.test(v) && !/^https:\/\/(line\.me|lin\.ee|liff\.line\.me)\/\S+$/.test(v)) {
      throw vtError(400, 'BAD_LINK', 'ใส่ LINE ID ที่ขึ้นต้นด้วย @ หรือลิงก์ https://lin.ee/… / https://line.me/…')
    }
    PropertiesService.getScriptProperties().setProperty('HR_LINK', v)
    return { value: v, url: lineHrLink() }
  },

  accessRequests: (body) => {
    requireAdmin(body)
    const users = getUsers()
    const byEmp = {}
    Object.keys(users).forEach((k) => (byEmp[users[k].empId] = users[k]))
    return {
      requests: readDataTab('ACCESS')
        .filter((r) => r[0] && r[4] !== 'อนุมัติแล้ว' && r[4] !== 'ปฏิเสธ')
        .map((r) => {
          const emp = byEmp[r[3]]
          return {
            sub: r[0],
            lineName: r[1],
            picture: /^https:\/\/[\w.-]*line-scdn\.net\//.test(r[2]) ? r[2] : '',
            empId: r[3],
            status: r[4],
            requestedAt: r[5],
            employee: emp ? { empId: emp.empId, display: displayName(emp), dept: emp.dept, branch: emp.branch, photoId: emp.photoId, lineName: emp.lineName } : null,
          }
        })
        .reverse(),
    }
  },

  resolveAccess: (body) => {
    const admin = requireAdmin(body)
    const row = accessRow(String(body.sub || ''))
    if (!row) throw vtError(404, 'REQUEST_NOT_FOUND', 'ไม่พบคำขอนี้')
    if (body.approve) {
      const users = getUsers()
      const empId = String(body.empId || row.values[3] || '').trim()
      const uid = Object.keys(users).find((k) => users[k].empId === empId)
      if (!uid) throw vtError(400, 'UNKNOWN_EMPLOYEE', 'ไม่พบรหัสพนักงาน ' + empId + ' ในรายชื่อที่ลงทะเบียน LINE HR')
      PropertiesService.getScriptProperties().setProperty('link:' + row.values[0], uid)
      row.sheet.getRange(row.index, 4, 1, 5).setNumberFormat('@').setValues([[empId, 'อนุมัติแล้ว', row.values[5], displayName(admin), nowText()]])
    } else {
      row.sheet.getRange(row.index, 5, 1, 4).setNumberFormat('@').setValues([['ปฏิเสธ', row.values[5], displayName(admin), nowText()]])
    }
    return { sub: row.values[0] }
  },

  employees: (body) => {
    requireAdmin(body)
    const users = getUsers()
    return {
      employees: Object.keys(users)
        .map((k) => ({ empId: users[k].empId, display: displayName(users[k]), dept: users[k].dept }))
        .sort((a, b) => a.display.localeCompare(b.display, 'th')),
    }
  },

  admins: (body) => {
    requireAdmin(body)
    return { admins: adminList() }
  },

  saveAdmins: (body) => {
    const me = requireAdmin(body)
    const users = getUsers()
    const known = {}
    Object.keys(users).forEach((k) => (known[users[k].empId] = 1))
    const ids = (body.empIds || []).map((x) => String(x).trim()).filter((x, i, a) => x && a.indexOf(x) === i)
    const unknown = ids.filter((x) => !known[x])
    if (unknown.length) throw vtError(400, 'UNKNOWN_EMPLOYEE', 'ไม่พบรหัสพนักงาน ' + unknown.join(', ') + ' ในรายชื่อที่ลงทะเบียน LINE HR')
    if (ids.indexOf(me.empId) === -1) throw vtError(400, 'SELF_REMOVE', 'ลบตัวเองออกจากผู้ดูแลไม่ได้')
    PropertiesService.getScriptProperties().setProperty('ADMINS', JSON.stringify(ids))
    return { admins: adminList() }
  },
}

/* ───────────── auth ───────────── */

// รูปโปรไฟล์ LINE (จาก ID token ที่ LINE ยืนยันแล้ว) เก็บไว้ใน session เพื่อใช้เป็นรูปในแอป
function sessionFor(u, pic) {
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000
  const picture = /^https:\/\/[\w.-]*line-scdn\.net\//.test(String(pic || '')) ? String(pic) : ''
  return {
    token: signSession({ uid: u.uid, exp: exp, pic: picture }),
    user: profile(u, picture),
  }
}

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
  return { sub: String(data.sub), picture: String(data.picture || ''), name: String(data.name || '') }
}

// บันทึกคนที่ login ไม่ผ่าน (1 แถวต่อบัญชี LINE) ให้แอดมินดู/ยืนยันได้
function accessRow(sub) {
  const sh = dataBook().getSheetByName('ACCESS')
  if (sh.getLastRow() < 2) return null
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, DATA_TABS.ACCESS.length).getDisplayValues()
  const i = values.findIndex((r) => r[0] === sub)
  return i === -1 ? null : { sheet: sh, index: i + 2, values: values[i] }
}

function recordAccessRequest(line) {
  const row = accessRow(line.sub)
  if (row) {
    const status = row.values[4] === 'ปฏิเสธ' || row.values[4] === 'อนุมัติแล้ว' ? 'ขอใหม่' : row.values[4]
    row.sheet.getRange(row.index, 2, 1, 4).setNumberFormat('@').setValues([[line.name, line.picture, row.values[3], status]])
    return { empId: row.values[3] }
  }
  appendDataRow('ACCESS', [line.sub, line.name, line.picture, '', 'ยังไม่แจ้งรหัส', nowText(), '', ''])
  return { empId: '' }
}

// LINE ฝ่ายบุคคล @712dqxgv (ลิงก์เดียวกับแอปลงเวลา/Rattana 360) · แอดมินเปลี่ยนได้ในแดชบอร์ด
const DEFAULT_HR_LINK = 'https://lin.ee/uIN2DMR'

function lineHrLink() {
  const v = PropertiesService.getScriptProperties().getProperty('HR_LINK') || DEFAULT_HR_LINK
  return v.charAt(0) === '@' ? 'https://line.me/R/ti/p/' + encodeURIComponent(v) : v
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

function adminIds() {
  const raw = PropertiesService.getScriptProperties().getProperty('ADMINS')
  return raw ? JSON.parse(raw) : SEED_ADMIN_EMP_IDS
}

const isAdmin = (u) => adminIds().indexOf(String(u.empId)) !== -1

function adminList() {
  const users = getUsers()
  const byEmp = {}
  Object.keys(users).forEach((k) => (byEmp[users[k].empId] = users[k]))
  return adminIds().map((id) => ({ empId: id, display: byEmp[id] ? displayName(byEmp[id]) : '(ไม่พบในรายชื่อ)' }))
}

/* ───────────── users (LINE_USERS) ───────────── */

function getUsers() {
  const cache = CacheService.getScriptCache()
  const hit = cache.get('users2')
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
      lineName: normName(r[6]),
      picKey: pictureKey(r[7]),
      photoId: driveId(r[13]),
    }
  })
  try {
    cache.put('users2', JSON.stringify(users), 600)
  } catch (_) {
    /* over 100KB: read the sheet each time */
  }
  return users
}

/*
 * LINE_USERS เก็บ userId จาก LINE HR ซึ่งอยู่คนละ provider กับ LINE Login ของแอปนี้ (userId จึงไม่ตรงกัน)
 * เลยจับคู่ครั้งแรกด้วยข้อมูลที่ LINE ยืนยันใน ID token: รูปโปรไฟล์ (คอลัมน์ H) ก่อน แล้วค่อยชื่อ LINE (คอลัมน์ G)
 * ต้องตรงกับพนักงานคนเดียวเท่านั้น จับคู่ได้แล้วจำไว้ใน Script Properties ครั้งต่อไปไม่ต้องเทียบใหม่
 */
function findEmployee(line) {
  const users = getUsers()
  if (users[line.sub]) return users[line.sub]

  const props = PropertiesService.getScriptProperties()
  const linked = props.getProperty('link:' + line.sub)
  if (linked && users[linked]) return users[linked]

  const list = Object.keys(users).map((k) => users[k])
  const pic = pictureKey(line.picture)
  let hits = pic ? list.filter((u) => u.picKey === pic) : []
  if (hits.length !== 1) {
    const name = normName(line.name)
    hits = name ? list.filter((u) => u.lineName === name) : []
  }
  if (hits.length !== 1) return null
  props.setProperty('link:' + line.sub, hits[0].uid)
  return hits[0]
}

function pictureKey(url) {
  const m = String(url || '').match(/line-scdn\.net\/([^?#\s]+)/)
  return m ? m[1].replace(/\/(small|large|preview)$/, '') : ''
}

function normName(v) {
  return cleanSpaces(v).normalize('NFC')
}

function profile(u, picture) {
  return {
    id: u.uid,
    picture: picture || '',
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

/* ───────────── data book (VOTE TOGETHER Data) ───────────── */

function dataBook() {
  const props = PropertiesService.getScriptProperties()
  const id = props.getProperty('DATA_SHEET_ID')
  let ss = null
  if (id) {
    try {
      ss = SpreadsheetApp.openById(id)
    } catch (_) {
      ss = null
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('VOTE TOGETHER Data')
    props.setProperty('DATA_SHEET_ID', ss.getId())
  }
  Object.keys(DATA_TABS).forEach((name) => {
    const existing = ss.getSheetByName(name)
    if (existing && existing.getLastColumn() < DATA_TABS[name].length) {
      existing.getRange(1, 1, 1, DATA_TABS[name].length).setNumberFormat('@').setValues([DATA_TABS[name]]).setFontWeight('bold')
    }
    if (existing) return
    const sh = ss.insertSheet(name)
    sh.getRange(1, 1, 1, DATA_TABS[name].length).setNumberFormat('@').setValues([DATA_TABS[name]]).setFontWeight('bold')
    sh.setFrozenRows(1)
  })
  ss.getSheets()
    .filter((s) => !DATA_TABS[s.getName()])
    .forEach((s) => s.getLastRow() === 0 && ss.getSheets().length > 1 && ss.deleteSheet(s))
  return ss
}

function readDataTab(name) {
  const sh = dataBook().getSheetByName(name)
  if (sh.getLastRow() < 2) return []
  return sh.getRange(2, 1, sh.getLastRow() - 1, DATA_TABS[name].length).getDisplayValues()
}

function appendDataRow(name, row) {
  const sh = dataBook().getSheetByName(name)
  sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setNumberFormat('@').setValues([row.map(String)])
  SpreadsheetApp.flush()
}

function uploadFolder() {
  const props = PropertiesService.getScriptProperties()
  const id = props.getProperty('UPLOAD_FOLDER_ID')
  if (id) {
    try {
      return DriveApp.getFolderById(id)
    } catch (_) {
      /* recreate below */
    }
  }
  const parents = DriveApp.getFileById(dataBook().getId()).getParents()
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder()
  const folder = parent.createFolder('VOTE TOGETHER Uploads')
  props.setProperty('UPLOAD_FOLDER_ID', folder.getId())
  return folder
}

/* ───────────── campaigns ───────────── */

function newId(prefix) {
  return prefix + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10)
}

function listCampaigns() {
  const cache = CacheService.getScriptCache()
  const hit = cache.get('campaigns3')
  if (hit) return JSON.parse(hit)

  let rows = readDataTab('CAMPAIGNS')
  if (!rows.length) {
    // ครั้งแรก: ย้ายกิจกรรมเดิม (ตั้งค่าแบบชีท) เข้ามาเป็นกิจกรรมแรก
    const raw = PropertiesService.getScriptProperties().getProperty('CONFIG')
    const old = raw ? JSON.parse(raw) : DEFAULT_EVENT
    const first = Object.assign({}, old, { id: newId('c'), source: 'sheet', createdAt: nowText(), createdBy: 'ระบบ', published: true })
    writeCampaign(first)
    rows = readDataTab('CAMPAIGNS')
  }
  const legacyActive = PropertiesService.getScriptProperties().getProperty('ACTIVE_CAMPAIGN')
  const list = rows
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0],
      title: r[1],
      subtitle: r[2],
      endsAt: r[3],
      resultsMode: resultsModeOf(r[4]),
      showCounts: resultsModeOf(r[4]) === 'always',
      source: r[5] === 'sheet' ? 'sheet' : 'app',
      sheetUrl: r[6],
      createdAt: r[7],
      createdBy: r[8],
      // แถวก่อน v3.0 ไม่มีคอลัมน์นี้: ใช้กิจกรรมที่เคยเปิดใช้อยู่
      published: r[9] ? r[9] === 'yes' : r[0] === legacyActive,
      deleted: r[10] === 'yes',
    }))
    .filter((c) => !c.deleted)
    .reverse()
  cache.put('campaigns3', JSON.stringify(list), 120)
  return list
}

function writeCampaign(c) {
  const row = [c.id, c.title, c.subtitle, c.endsAt, c.resultsMode || (c.showCounts ? 'always' : 'never'), c.source, c.sheetUrl || '', c.createdAt, c.createdBy, c.published ? 'yes' : 'no', c.deleted ? 'yes' : '']
  const sh = dataBook().getSheetByName('CAMPAIGNS')
  const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues().map((r) => r[0]) : []
  const at = ids.indexOf(c.id)
  if (at === -1) appendDataRow('CAMPAIGNS', row)
  else sh.getRange(at + 2, 1, 1, row.length).setNumberFormat('@').setValues([row.map(String)])
  CacheService.getScriptCache().remove('campaigns3')
}

function campaignById(id) {
  const c = listCampaigns().find((x) => x.id === String(id))
  if (!c) throw vtError(404, 'CAMPAIGN_NOT_FOUND', 'ไม่พบกิจกรรมนี้')
  return c
}

// ผู้โหวตเข้าได้เฉพาะกิจกรรมที่แสดงอยู่ (แอดมินเข้าได้ทุกกิจกรรมเพื่อดูตัวอย่าง)
function voterCampaign(body, u) {
  const c = listCampaigns().find((x) => x.id === String(body.campaignId || ''))
  if (!c || (!c.published && !(u && isAdmin(u)))) throw vtError(404, 'CAMPAIGN_NOT_FOUND', 'ไม่พบกิจกรรมนี้ หรือปิดการแสดงแล้ว')
  return c
}

// ค่าเก่าในชีทเป็น yes/no
function resultsModeOf(v) {
  if (v === 'yes') return 'always'
  return RESULT_MODES.indexOf(v) !== -1 ? v : 'never'
}

function resultsVisible(cfg, u, participated) {
  if (u && isAdmin(u)) return true
  const mode = cfg.resultsMode || 'never'
  return mode === 'always' || (mode === 'afterVote' && participated) || (mode === 'afterClose' && isClosed(cfg))
}

function liveResults(cfg) {
  const cache = CacheService.getScriptCache()
  const hit = cache.get('live:' + cfg.id)
  if (hit) return JSON.parse(hit)
  let data
  if (cfg.source === 'form') {
    data = Object.assign({ kind: 'form' }, aggregate(readQuestions(cfg), readResponses(cfg), false))
  } else {
    const votes = readVotes(cfg)
    const counts = countVotes(votes)
    data = {
      kind: 'ranking',
      total: votes.length,
      entries: readEntries(cfg)
        .map((e) => ({ id: e.id, title: e.title, author: e.author, imageId: e.imageId, votes: counts[e.id] || 0 }))
        .sort((a, b) => b.votes - a.votes),
    }
  }
  try {
    cache.put('live:' + cfg.id, JSON.stringify(data), LIVE_CACHE_SECONDS)
  } catch (_) {
    /* very large result: skip caching */
  }
  return data
}

function hasParticipated(cfg, uid) {
  return cfg.source === 'form' ? readResponses(cfg).some((r) => r.uid === uid) : readVotes(cfg).some((v) => v.uid === uid)
}

function publicCampaign(cfg) {
  return {
    id: cfg.id,
    title: cfg.title,
    subtitle: cfg.subtitle,
    endsAt: cfg.endsAt || null,
    showCounts: cfg.resultsMode === 'always',
    resultsMode: cfg.resultsMode || 'never',
    source: cfg.source,
    published: Boolean(cfg.published),
    closed: isClosed(cfg),
  }
}

const isClosed = (cfg) => Boolean(cfg.endsAt) && Date.now() > new Date(cfg.endsAt).getTime()

/* ───────────── entries ───────────── */

const entriesCacheKey = (cfg) =>
  cfg.source === 'app' ? 'entries:app:' + cfg.id : 'entries:' + Utilities.base64EncodeWebSafe(cfg.sheetUrl).slice(-60)

function clearEntriesCache(cfg) {
  CacheService.getScriptCache().remove(entriesCacheKey(cfg))
}

function readEntries(cfg) {
  if (cfg.source === 'form') return []
  const cache = CacheService.getScriptCache()
  const key = entriesCacheKey(cfg)
  const hit = cache.get(key)
  if (hit) return JSON.parse(hit)
  const entries = cfg.source === 'app' ? readAppEntries(cfg) : readSheetEntries(cfg)
  try {
    cache.put(key, JSON.stringify(entries), 120)
  } catch (_) {
    /* too many entries for one cache value */
  }
  return entries
}

function readAppEntries(cfg) {
  return readDataTab('ENTRIES')
    .filter((r) => r[0] === cfg.id && r[1])
    .map((r) => ({ id: r[1], title: r[2], author: r[3], imageId: r[4], width: Number(r[5]) || null, height: Number(r[6]) || null }))
}

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

function readSheetEntries(cfg) {
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
  return entries
}

/* ───────────── votes ───────────── */

function eventVotesSheet(cfg) {
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
  if (cfg.source === 'form') return []
  const toVote = (r) => ({ time: r[0], uid: r[1], empId: r[2], name: r[3], entryId: r[4], title: r[5] })
  if (cfg.source === 'app') {
    return readDataTab('VOTES')
      .filter((r) => r[0] === cfg.id && r[2])
      .map((r) => toVote(r.slice(1)))
  }
  const sh = eventSheet(cfg).ss.getSheetByName(VOTES_TAB)
  if (!sh || sh.getLastRow() < 2) return []
  return sh
    .getRange(2, 1, sh.getLastRow() - 1, VOTES_HEADER.length)
    .getDisplayValues()
    .filter((r) => r[1])
    .map(toVote)
}

function appendVote(cfg, row) {
  if (cfg.source === 'app') return appendDataRow('VOTES', [cfg.id].concat(row))
  const sh = eventVotesSheet(cfg)
  sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setNumberFormat('@').setValues([row])
  SpreadsheetApp.flush()
}

function countVotes(votes) {
  return votes.reduce((m, v) => ((m[v.entryId] = (m[v.entryId] || 0) + 1), m), {})
}

/* ───────────── แบบสอบถาม: คำถาม · คำตอบ · สรุปผล ───────────── */

const shortId = (prefix) => prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 10)
const safeFileId = (v) => (/^[-\w]{20,}$/.test(String(v || '')) ? String(v) : '')

function saveUpload(cfg, dataUrl) {
  const m = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)
  if (!m) throw vtError(400, 'BAD_IMAGE', 'ไฟล์รูปไม่ถูกต้อง รองรับ JPG, PNG, WEBP')
  const bytes = Utilities.base64Decode(m[2])
  if (bytes.length > MAX_UPLOAD_BYTES) throw vtError(413, 'TOO_LARGE', 'รูปใหญ่เกิน 4MB')
  return uploadFolder().createFile(Utilities.newBlob(bytes, m[1], cfg.id + '-' + Date.now() + '.jpg'))
}

function cleanQuestions(list) {
  if (!Array.isArray(list) || !list.length) throw vtError(400, 'NO_QUESTIONS', 'เพิ่มคำถามอย่างน้อย 1 ข้อ')
  if (list.length > 50) throw vtError(400, 'TOO_MANY', 'คำถามได้ไม่เกิน 50 ข้อ')
  return list.map((q, i) => {
    const type = QUESTION_TYPES.indexOf(q.type) !== -1 ? q.type : 'single'
    const title = cleanSpaces(q.title).slice(0, 300)
    if (!title) throw vtError(400, 'BAD_QUESTION', 'คำถามข้อ ' + (i + 1) + ' ยังไม่มีหัวข้อ')
    const out = {
      id: /^q\w{6,}$/.test(String(q.id)) ? String(q.id) : shortId('q'),
      type: type,
      title: title,
      description: String(q.description || '').trim().slice(0, 500),
      required: q.required !== false,
      imageId: safeFileId(q.imageId),
      options: [],
      max: 0,
    }
    if (type === 'single' || type === 'multi') {
      out.options = (q.options || [])
        .map((o) => ({ id: /^o\w{6,}$/.test(String(o.id)) ? String(o.id) : shortId('o'), label: cleanSpaces(o.label).slice(0, 200), imageId: safeFileId(o.imageId) }))
        .filter((o) => o.label || o.imageId)
      if (out.options.length < 2) throw vtError(400, 'FEW_OPTIONS', 'คำถามข้อ ' + (i + 1) + ' ต้องมีตัวเลือกอย่างน้อย 2 ข้อ')
      if (type === 'multi') out.max = Math.max(0, Math.min(out.options.length, Number(q.max) || 0))
    }
    return out
  })
}

function writeQuestions(cfg, qs) {
  const sh = dataBook().getSheetByName('QUESTIONS')
  const rows = sh.getDataRange().getDisplayValues()
  for (let i = rows.length - 1; i >= 1; i--) if (rows[i][0] === cfg.id) sh.deleteRow(i + 1)
  if (qs.length) {
    const data = qs.map((q, i) => [cfg.id, q.id, String(i + 1), q.type, q.title, JSON.stringify(q)])
    sh.getRange(sh.getLastRow() + 1, 1, data.length, data[0].length).setNumberFormat('@').setValues(data)
  }
  SpreadsheetApp.flush()
  CacheService.getScriptCache().remove('q:' + cfg.id)
}

function readQuestions(cfg) {
  const cache = CacheService.getScriptCache()
  const hit = cache.get('q:' + cfg.id)
  if (hit) return JSON.parse(hit)
  const qs = readDataTab('QUESTIONS')
    .filter((r) => r[0] === cfg.id)
    .sort((a, b) => Number(a[2]) - Number(b[2]))
    .map((r) => JSON.parse(r[5]))
  try {
    cache.put('q:' + cfg.id, JSON.stringify(qs), 300)
  } catch (_) {
    /* very large form: read each time */
  }
  return qs
}

function formImageIds(cfg) {
  const ids = []
  readQuestions(cfg).forEach((q) => {
    if (q.imageId) ids.push(q.imageId)
    ;(q.options || []).forEach((o) => o.imageId && ids.push(o.imageId))
  })
  return ids
}

function readResponses(cfg) {
  if (cfg.source !== 'form') return []
  return readDataTab('RESPONSES')
    .filter((r) => r[0] === cfg.id && r[2])
    .map((r) => {
      let answers = {}
      try {
        answers = JSON.parse(r[5] || '{}')
      } catch (_) {
        answers = {}
      }
      return { time: r[1], uid: r[2], empId: r[3], name: r[4], answers: answers }
    })
}

function cleanAnswers(qs, answers) {
  const out = {}
  qs.forEach((q, i) => {
    const a = answers[q.id]
    const need = () => {
      if (q.required) throw vtError(400, 'MISSING_ANSWER', 'กรุณาตอบข้อ ' + (i + 1) + ': ' + q.title, { questionId: q.id })
    }
    if (q.type === 'single') {
      if (q.options.some((o) => o.id === a)) out[q.id] = a
      else need()
    } else if (q.type === 'multi') {
      const picked = (Array.isArray(a) ? a : []).filter((id, k, arr) => arr.indexOf(id) === k && q.options.some((o) => o.id === id))
      if (q.max && picked.length > q.max) throw vtError(400, 'TOO_MANY_PICKS', 'ข้อ ' + (i + 1) + ' เลือกได้ไม่เกิน ' + q.max + ' ข้อ', { questionId: q.id })
      if (picked.length) out[q.id] = picked
      else need()
    } else if (q.type === 'text') {
      const t = String(a || '').trim().slice(0, 1000)
      if (t) out[q.id] = t
      else need()
    } else if (q.type === 'rating') {
      const n = Number(a)
      if (n >= 1 && n <= 5 && n % 1 === 0) out[q.id] = n
      else need()
    }
  })
  return out
}

function readableAnswers(qs, answers) {
  return qs
    .map((q, i) => {
      const a = answers[q.id]
      if (a === undefined) return ''
      const label = (id) => (q.options.find((o) => o.id === id) || {}).label || '(รูป)'
      const text = q.type === 'single' ? label(a) : q.type === 'multi' ? a.map(label).join(', ') : String(a)
      return (i + 1) + '. ' + text
    })
    .filter(Boolean)
    .join(' | ')
}

// สรุปผลรายข้อ (ข้อความตอบอิสระส่งเฉพาะให้แอดมิน และไม่แนบชื่อผู้ตอบ)
function aggregate(qs, responses, withText) {
  return {
    total: responses.length,
    questions: qs.map((q) => {
      const r = { id: q.id, type: q.type, title: q.title, answered: 0 }
      const values = responses.map((x) => x.answers[q.id]).filter((v) => v !== undefined && v !== null && v !== '')
      r.answered = values.length
      if (q.type === 'single' || q.type === 'multi') {
        const counts = {}
        values.forEach((v) => (Array.isArray(v) ? v : [v]).forEach((id) => (counts[id] = (counts[id] || 0) + 1)))
        r.options = q.options.map((o) => ({ id: o.id, label: o.label, imageId: o.imageId, count: counts[o.id] || 0 }))
      } else if (q.type === 'rating') {
        const dist = [0, 0, 0, 0, 0]
        values.forEach((v) => dist[Number(v) - 1]++)
        r.distribution = dist
        r.average = values.length ? Math.round((values.reduce((a, b) => a + Number(b), 0) / values.length) * 10) / 10 : 0
      } else if (withText) {
        r.texts = values.slice(-200).reverse()
      }
      return r
    }),
  }
}

/* ───────────── Drive images (served only through this script) ───────────── */

function allowedImageIds(u, campaignId) {
  const ids = {}
  const add = (cfg) => {
    readEntries(cfg).forEach((e) => (ids[e.imageId] = 1))
    if (cfg.source === 'form') formImageIds(cfg).forEach((id) => (ids[id] = 1))
  }
  listCampaigns()
    .filter((c) => c.published)
    .forEach(add)
  if (campaignId && isAdmin(u)) add(campaignById(campaignId))
  if (u.photoId) ids[u.photoId] = 1
  if (isAdmin(u)) {
    const users = getUsers()
    Object.keys(users).forEach((k) => users[k].photoId && (ids[users[k].photoId] = 1))
  }
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
    const hit = getChunks('img2:' + size + ':' + id)
    if (hit) out[id] = hit
    else missing.push(id)
  })
  if (!missing.length) return out

  // thumbnailLink ใช้ได้หลายชั่วโมง จำไว้ 50 นาทีเพื่อข้ามการถาม Drive ไปหนึ่งรอบ
  const cache = CacheService.getScriptCache()
  const known = cache.getAll(missing.map((id) => 'tl:' + id))
  const want = []
  const direct = []
  const ask = []
  missing.forEach((id) => {
    const link = known['tl:' + id]
    if (link) want.push({ id: id, url: link.replace(/=s\d+$/, '=' + IMAGE_SIZES[size]), cached: true })
    else ask.push(id)
  })
  const links = UrlFetchApp.fetchAll(ask.map((id) => driveApi('files/' + id + '?supportsAllDrives=true&fields=thumbnailLink,size')))
  const fresh = {}
  links.forEach((r, k) => {
    if (r.getResponseCode() !== 200) return
    const d = JSON.parse(r.getContentText())
    if (d.thumbnailLink) {
      fresh['tl:' + ask[k]] = d.thumbnailLink
      want.push({ id: ask[k], url: d.thumbnailLink.replace(/=s\d+$/, '=' + IMAGE_SIZES[size]) })
    } else if (Number(d.size) < 15000000) direct.push(ask[k]) // รูปเพิ่งอัปโหลด Drive ยังทำ thumbnail ไม่เสร็จ
  })
  if (Object.keys(fresh).length) cache.putAll(fresh, 3000)
  const blobs = UrlFetchApp.fetchAll(
    want.map((w) => ({ url: w.url, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true })),
  )
  const put = (id, blob, cacheIt) => {
    // ส่งเป็น JPEG เสมอ: รูปย่อของไฟล์ PNG จากมือถือใหญ่กว่า JPEG หลายเท่า
    if (!/jpe?g/i.test(blob.getContentType() || '')) {
      try {
        blob = blob.getAs(MimeType.JPEG)
      } catch (_) {
        /* keep original format */
      }
    }
    const dataUrl = 'data:' + (blob.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(blob.getBytes())
    out[id] = dataUrl
    if (cacheIt) putChunks('img2:' + size + ':' + id, dataUrl, 21600)
  }
  blobs.forEach((r, k) => {
    if (r.getResponseCode() === 200) put(want[k].id, r.getBlob(), true)
    else if (want[k].cached) cache.remove('tl:' + want[k].id) // ลิงก์หมดอายุ ครั้งหน้าถามใหม่
  })
  direct.forEach((id) => {
    try {
      put(id, DriveApp.getFileById(id).getBlob(), false)
    } catch (_) {
      /* unreadable file */
    }
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
