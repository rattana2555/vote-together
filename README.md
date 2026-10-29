# VOTE TOGETHER · v3.1

**Your Vote. Our Moment.** — ทุกเสียงมีความหมาย ทุกการเลือกสร้างช่วงเวลาร่วมกัน

แอปโหวตกิจกรรมภายในบริษัทรัตนไพบูลย์ · React 19 + Vite 8 + Framer Motion · 3D ด้วย CSS ล้วน · PWA · Light/Dark mode

🔗 https://rattana2555.github.io/vote-together/

## ระบบทำงานอย่างไร

```
เว็บ (GitHub Pages) ──LIFF──▶ LINE (ได้ ID token)
       │
       └─POST {action}─▶ Apps Script (gas/Code.gs)
                           ├─ ยืนยัน ID token กับ LINE → จับคู่พนักงานใน LINE_USERS ด้วยรูปโปรไฟล์/ชื่อ LINE
                           ├─ กิจกรรมเก็บในชีท "VOTE TOGETHER Data" (แท็บ CAMPAIGNS · ENTRIES · VOTES)
                           │    · แบบอัปโหลดในแอป: รูปอยู่ในโฟลเดอร์ "VOTE TOGETHER Uploads" คะแนนอยู่แท็บ VOTES
                           │    · แบบ Google Sheet: อ่านผลงานจากชีทคำตอบ Form คะแนนอยู่แท็บ VOTE_TOGETHER_VOTES ของชีทนั้น
                           └─ ส่งรูปจาก Drive ผ่านสคริปต์ (ไฟล์ไม่ต้องแชร์สาธารณะ เห็นได้เฉพาะคนที่ login)
```

- ชื่อคนแสดงเป็น `ชื่อจริง (ชื่อเล่น)` เสมอ · รูปผู้ใช้มาจากคอลัมน์ N "รูปที่ส่ง (Drive)" ของ LINE_USERS
- **สร้าง/เปลี่ยนกิจกรรม:** แดชบอร์ด → แท็บ "กิจกรรม" → "+ สร้างกิจกรรมใหม่" เลือกได้ว่าจะอัปโหลดรูปในแอปเลย หรือวางลิงก์ชีทคำตอบ Google Form แล้วกด "เปิดใช้กิจกรรมนี้" หน้าแรกเปลี่ยนทันที กิจกรรมเก่ายังดูผลย้อนหลังได้ในแท็บ "ผลโหวต"
- **เชื่อม userId จริงของ LINE HR:** แดชบอร์ด → "ผู้ดูแล" → "เชื่อมกับ LINE HR" ใส่ Webhook เดิมของบอท HR และ LINE ID (@…) แล้วเปลี่ยนลิงก์ Webhook ของ LINE HR ใน OA Manager เป็น URL ที่แสดง · พนักงานที่เข้าครั้งแรกจะได้รหัส VT-xxxxxx ไปส่งในแชท LINE HR ครั้งเดียว ข้อความอื่นทั้งหมดถูกส่งต่อให้บอท HR ตามเดิม
- **ผู้ดูแล:** แดชบอร์ด → แท็บ "ผู้ดูแล" เพิ่ม/นำออกด้วยรหัสพนักงาน (ตั้งต้น `SEED_ADMIN_EMP_IDS` ใน `gas/Code.gs`)

## ตั้งค่า (ทำครั้งเดียว)

| อะไร | ที่ไหน |
|---|---|
| Apps Script | โปรเจกต์ "VOTE TOGETHER API" (scriptId ใน `gas/.clasp.json`) · deploy: `powershell -File D:\Calude\tools\gas-deploy.ps1` ในโฟลเดอร์ `gas` |
| อนุญาตสิทธิ์สคริปต์ | เปิดหน้า Apps Script แล้วกด Run ฟังก์ชัน `setup` 1 ครั้ง |
| LIFF | LINE Developers → provider **HR** → LINE Login channel `2012261091` (VOTE TOGETHER, Published) → LIFF `2012261091-KgtW0QdR` |
| ค่าให้เว็บ | GitHub repo → Settings → Secrets and variables → Actions → **Variables**: `VITE_API_BASE` (URL `/exec`), `VITE_LIFF_ID` |

push ขึ้น `main` แล้ว GitHub Actions จะ build และ deploy ขึ้น Pages ให้เอง

## รันในเครื่อง

```bash
npm install
```

```bash
npm run dev
```

ตอน dev จะใช้ mock backend (`mock/plugin.js`) ที่ทำตัวเหมือน `gas/Code.gs` พร้อมหน้า LINE จำลองให้เลือกเป็นแอดมิน พนักงาน หรือ LINE ที่ยังไม่ลงทะเบียน มีแถบ DEV สีเหลืองและช่องติ๊ก "จำลองบันทึกโหวตล้มเหลว" ไว้ทดสอบ ส่วนนี้ไม่ถูก build ไป production

## Actions ของ backend

ทุกคำขอเป็น `POST` แบบ `text/plain` body `{ action, token?, ... }` คืน `{ ok, ... }` หรือ `{ ok: false, status, code, message }`

| action | ต้อง login | คืนค่า |
|---|---|---|
| `campaign` | – | `{ campaign: { id, title, subtitle, endsAt, showCounts, source, closed } }` (กิจกรรมที่เปิดใช้) |
| `login` | – | `{ idToken }` → `{ token, user, votedEntryId }` |
| `me` | ✓ | `{ user, votedEntryId }` |
| `entries` | ✓ | `{ entries: [{ id, title, author, imageId, width, height, votes? }] }` |
| `images` | ✓ | `{ ids, size: s\|l\|a }` → `{ images: { id: dataUrl } }` (เฉพาะรูปของกิจกรรมและรูปตัวเอง) |
| `vote` | ✓ | `{ entryId }` → `{ entryId, votes? }` · 409 `ALREADY_VOTED` |
| `stats` | แอดมิน | `{ campaignId? }` → `{ campaign, totalVotes, voters, eligible, entries }` |
| `campaigns` / `campaignEntries` | แอดมิน | รายการกิจกรรม / ผลงานของกิจกรรม |
| `saveCampaign` / `activateCampaign` | แอดมิน | สร้าง-แก้ไข / เปิดใช้กิจกรรม |
| `addEntry` / `deleteEntry` | แอดมิน | อัปโหลดรูป (dataURL ≤ 4MB) / ลบผลงานที่ยังไม่มีคนโหวต |
| `employees` · `admins` / `saveAdmins` | แอดมิน | รายชื่อพนักงาน · จัดการผู้ดูแล |
| `checkLink` | – | `{ linkToken }` → `{ linked, token?, user? }` (รอรหัสจากแชท LINE HR) |
| `getLineHr` / `saveLineHr` | แอดมิน | ตั้งค่าเชื่อม LINE HR |
| `health` | – | ตัวเลขสรุป ไม่มีข้อมูลส่วนตัว |
| (LINE webhook) | – | body `{ destination, events }` → อ่านรหัส VT- แล้วส่งต่อที่เหลือให้บอท HR |

## กติกา UX ที่โค้ดบังคับไว้

- หน้าจอจะแสดงว่าโหวตสำเร็จ (ติ๊กถูก + confetti) ก็ต่อเมื่อ backend ตอบ `ok: true` แล้วเท่านั้น ถ้าล้มเหลวจะเขย่าเฉพาะส่วนปุ่มและแสดงข้อความ error
- เข้าสู่ระบบผ่าน LINE เท่านั้น และต้องเป็นบัญชีที่ลงทะเบียนพนักงานแล้ว
- ถ้าเครื่องผู้ใช้ตั้ง `prefers-reduced-motion` ไว้ animation ที่วนไม่รู้จบจะหยุด และ parallax จะปิด
