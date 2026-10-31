# VOTE TOGETHER · v4.7

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
- **หน้าแรก = รายการกิจกรรมที่เปิดอยู่** กดเข้าไปโหวตหรือตอบในแต่ละกิจกรรม (ลิงก์ตรง `/c/<รหัสกิจกรรม>`) แสดงพร้อมกันได้หลายกิจกรรม
- **ประเภทกิจกรรม:** แบบสอบถาม/โพล (สร้างคำถามเองแบบ Google Form: ตัวเลือกเดียว · หลายตัวเลือก · ข้อความ · ให้คะแนน 1–5 ใส่รูปได้ทั้งคำถามและตัวเลือก) · โหวตภาพอัปโหลดในแอป · โหวตภาพจาก Google Sheet
- **จัดการ:** แดชบอร์ด → "กิจกรรม" → "+ สร้างกิจกรรมใหม่" → กด "แสดงในหน้าโหวต" เมื่อพร้อม (กิจกรรมใหม่ซ่อนไว้ก่อน) · ผลรายข้อดูได้ในแท็บ "ผลโหวต"
- **ผลสดสำหรับผู้โหวต:** ตั้งในหน้าแก้ไขกิจกรรมว่าเห็นผลเมื่อไหร่ (หลังโหวต/ตอบแล้ว · ตลอดเวลา · หลังปิดโหวต · ไม่ให้เห็น) หน้ากิจกรรมอัปเดตเองทุก 20 วินาที มีแท็บ "อันดับตอนนี้" สำหรับโหวตภาพ และกราฟรายข้อสำหรับแบบสอบถาม (ผลรวมฝั่ง backend จำไว้ 15 วินาที)
- **ปิดโหวต:** ปุ่ม "ปิดโหวตตอนนี้" / "เปิดโหวตอีกครั้ง" บนการ์ดในแดชบอร์ด และบนหน้ากิจกรรม (เห็นเฉพาะแอดมิน) ปิด = ตั้งวันปิดเป็นตอนนี้ · เปิดอีกครั้ง = ล้างวันปิด
- **ลบกิจกรรม:** ปุ่ม "ลบ" ในแท็บกิจกรรม เอาออกจากแอปทันที แต่ข้อมูลยังอยู่ในชีท (กู้คืน: ลบคำว่า yes ในคอลัมน์ "ลบแล้ว" ของแท็บ CAMPAIGNS)
- **ลงทะเบียน LINE HR แล้วแต่เข้าไม่ได้** (จับคู่รูป/ชื่อ LINE ไม่ได้ เช่นเปลี่ยนรูปหลังลงทะเบียน): หน้าเข้าสู่ระบบให้กรอกรหัสพนักงานเพื่อส่งคำขอ → แอดมินดูที่แท็บ "คำขอเข้าใช้" เทียบรูป/ชื่อ แล้วกดยืนยันครั้งเดียว (บันทึกในแท็บ ACCESS ของชีท Data)
- **คนที่ยังไม่ลงทะเบียน LINE HR** จะเห็นปุ่ม "ไปลงทะเบียนที่ LINE HR" ตั้งลิงก์ได้ที่ แดชบอร์ด → ผู้ดูแล (ค่าเริ่มต้น LINE ฝ่ายบุคคล @712dqxgv · https://lin.ee/uIN2DMR · เป็นแค่ลิงก์เปิดแชท ห้ามแก้ webhook ของ LINE HR)
- รูปโหลดผ่าน Apps Script แล้วจำไว้ในเครื่อง (Cache Storage) เปิดครั้งต่อไปขึ้นทันที และโหลดเฉพาะรูปที่ใกล้จะเห็นบนจอ
- รูปผู้ใช้ในแอป = รูปโปรไฟล์ LINE ที่ได้ตอน login (ถ้าโหลดไม่ได้ใช้รูปในคอลัมน์ N ของ LINE_USERS)
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
| `openCampaigns` | – | กิจกรรมที่แสดงอยู่ + `done` ถ้า login แล้ว |
| `campaign` | – | `{ campaignId }` → `{ campaign }` |
| `login` | – | `{ idToken }` → `{ token, user, votedEntryId }` |
| `me` | ✓ | `{ user, votedEntryId }` |
| `entries` | ✓ | `{ campaignId }` → `{ entries, votedEntryId }` |
| `images` | ✓ | `{ ids, size: s\|l\|a }` → `{ images: { id: dataUrl } }` (เฉพาะรูปของกิจกรรมและรูปตัวเอง) |
| `vote` | ✓ | `{ campaignId, entryId }` → `{ entryId, votes? }` · 409 `ALREADY_VOTED` |
| `results` | ✓ | `{ campaignId }` → `{ mode, visible, data }` ผลสด (ตามสิทธิ์ที่แอดมินตั้ง) |
| `form` / `submitResponse` | ✓ | คำถาม + คำตอบของฉัน / ส่งคำตอบ (409 `ALREADY_ANSWERED`) |
| `stats` | แอดมิน | `{ campaignId? }` → `{ campaign, totalVotes, voters, eligible, entries }` |
| `campaigns` / `campaignEntries` | แอดมิน | รายการกิจกรรม / ผลงานของกิจกรรม |
| `saveCampaign` / `setPublished` | แอดมิน | สร้าง-แก้ไข / แสดง-ซ่อนในหน้าโหวต |
| `campaignQuestions` / `saveQuestions` / `uploadImage` / `formResults` | แอดมิน | ตัวสร้างแบบสอบถามและผลรายข้อ |
| `addEntry` / `deleteEntry` | แอดมิน | อัปโหลดรูป (dataURL ≤ 4MB) / ลบผลงานที่ยังไม่มีคนโหวต |
| `employees` · `admins` / `saveAdmins` | แอดมิน | รายชื่อพนักงาน · จัดการผู้ดูแล |
| `requestAccess` | – | `{ requestToken, empId }` คนที่ login ไม่ผ่านแจ้งรหัสพนักงาน |
| `accessRequests` / `resolveAccess` | แอดมิน | คำขอเข้าใช้ / ยืนยัน-ปฏิเสธ (ผูกบัญชี LINE กับพนักงาน) |
| `setClosed` / `setResultsMode` | แอดมิน | ปิด-เปิดโหวต / เปลี่ยนการแสดงผลสด |
| `deleteCampaign` | แอดมิน | ซ่อนกิจกรรมออกจากแอป (ข้อมูลยังอยู่ในชีท) |
| `getLineHrLink` / `saveLineHrLink` | แอดมิน | ลิงก์ LINE HR สำหรับปุ่มลงทะเบียน |
| `health` · `imageHealth` | – | ตัวเลขสรุป · สถานะรูป (ชนิด ขนาด มีรูปย่อหรือยัง) ไม่มีข้อมูลส่วนตัว |

## กติกา UX ที่โค้ดบังคับไว้

- หน้าจอจะแสดงว่าโหวตสำเร็จ (ติ๊กถูก + confetti) ก็ต่อเมื่อ backend ตอบ `ok: true` แล้วเท่านั้น ถ้าล้มเหลวจะเขย่าเฉพาะส่วนปุ่มและแสดงข้อความ error
- เข้าสู่ระบบผ่าน LINE เท่านั้น และต้องเป็นบัญชีที่ลงทะเบียนพนักงานแล้ว
- ถ้าเครื่องผู้ใช้ตั้ง `prefers-reduced-motion` ไว้ animation ที่วนไม่รู้จบจะหยุด และ parallax จะปิด
