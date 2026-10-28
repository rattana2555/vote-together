# VOTE TOGETHER · v2.1

**Your Vote. Our Moment.** — ทุกเสียงมีความหมาย ทุกการเลือกสร้างช่วงเวลาร่วมกัน

แอปโหวตกิจกรรมภายในบริษัทรัตนไพบูลย์ · React 19 + Vite 8 + Framer Motion · 3D ด้วย CSS ล้วน · PWA · Light/Dark mode

🔗 https://rattana2555.github.io/vote-together/

## ระบบทำงานอย่างไร

```
เว็บ (GitHub Pages) ──LIFF──▶ LINE (ได้ ID token)
       │
       └─POST {action}─▶ Apps Script (gas/Code.gs)
                           ├─ ยืนยัน ID token กับ LINE → ต้องมี userId ในแท็บ LINE_USERS (Rattana Users for apps)
                           ├─ อ่านผลงานจากชีทกิจกรรม (เช่นชีทคำตอบ Google Form)
                           ├─ ส่งรูปจาก Drive ผ่านสคริปต์ (ไฟล์ไม่ต้องแชร์สาธารณะ เห็นได้เฉพาะคนที่ login)
                           └─ บันทึกโหวตในแท็บ VOTE_TOGETHER_VOTES ของชีทกิจกรรม (1 บัญชี LINE = 1 โหวต)
```

- ชื่อคนแสดงเป็น `ชื่อจริง (ชื่อเล่น)` เสมอ · รูปผู้ใช้มาจากคอลัมน์ N "รูปที่ส่ง (Drive)" ของ LINE_USERS
- **เปลี่ยนกิจกรรม:** แอดมินไปที่หน้า "แดชบอร์ด" → "ตั้งค่ากิจกรรม" แล้ววางลิงก์ชีทใหม่ แอปจะหาคอลัมน์ชื่อภาพ, ชื่อจริง, ชื่อเล่น และลิงก์รูปเอง
- แอดมิน = รหัสพนักงานใน `ADMIN_EMP_IDS` บนหัวไฟล์ `gas/Code.gs`

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
| `campaign` | – | `{ campaign: { title, subtitle, endsAt, showCounts, closed } }` |
| `login` | – | `{ idToken }` → `{ token, user, votedEntryId }` |
| `me` | ✓ | `{ user, votedEntryId }` |
| `entries` | ✓ | `{ entries: [{ id, title, author, imageId, width, height, votes? }] }` |
| `images` | ✓ | `{ ids, size: s\|l\|a }` → `{ images: { id: dataUrl } }` (เฉพาะรูปของกิจกรรมและรูปตัวเอง) |
| `vote` | ✓ | `{ entryId }` → `{ entryId, votes? }` · 409 `ALREADY_VOTED` |
| `stats` | แอดมิน | `{ totalVotes, voters, eligible, entries }` |
| `getConfig` / `saveConfig` | แอดมิน | ตั้งค่าชีทกิจกรรม |

## กติกา UX ที่โค้ดบังคับไว้

- หน้าจอจะแสดงว่าโหวตสำเร็จ (ติ๊กถูก + confetti) ก็ต่อเมื่อ backend ตอบ `ok: true` แล้วเท่านั้น ถ้าล้มเหลวจะเขย่าเฉพาะส่วนปุ่มและแสดงข้อความ error
- เข้าสู่ระบบผ่าน LINE เท่านั้น และต้องเป็นบัญชีที่ลงทะเบียนพนักงานแล้ว
- ถ้าเครื่องผู้ใช้ตั้ง `prefers-reduced-motion` ไว้ animation ที่วนไม่รู้จบจะหยุด และ parallax จะปิด
