# VOTE TOGETHER · v1.0

**Your Vote. Our Moment.** — ทุกเสียงมีความหมาย ทุกการเลือกสร้างช่วงเวลาร่วมกัน

React 19 + Vite 8 + Framer Motion · 3D ทำด้วย CSS ล้วน ไม่ใช้ WebGL · PWA · Light/Dark mode

## รัน

```bash
npm install
```

```bash
npm run dev
```

ตอน `npm run dev` จะเปิด mock backend กับหน้า LINE จำลองให้อัตโนมัติ (`mock/plugin.js` + `.env.development`) มีแถบสีเหลือง DEV แสดงอยู่ และมีช่องติ๊ก "จำลองบันทึกโหวตล้มเหลว" ไว้ทดสอบกรณี error ส่วน mock ทั้งหมดนี้ **ไม่ถูก build ไป production**

## Production

1. คัดลอก `.env.example` เป็น `.env` แล้วใส่ `VITE_LINE_CHANNEL_ID` และ `VITE_API_BASE`
2. ใน LINE Developers Console ให้ตั้ง Callback URL เป็น `https://<โดเมน>/auth/callback`
3. รัน `npm run build` แล้ว deploy โฟลเดอร์ `dist/` โดยตั้ง SPA fallback ให้ทุก path ไปที่ `index.html`

## สัญญา API ที่ backend ต้องมี

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/campaign` | – | `{ id, title, subtitle, endsAt, showCounts }` |
| GET | `/entries` | – | `[{ id, title, author, description, image, width, height, votes? }]` |
| POST | `/auth/line` | – | body `{ code, codeVerifier, nonce, redirectUri }` → `{ token, user: { id, name, avatar, role } }` |
| GET | `/me` | Bearer | `{ user, votedEntryId }` |
| POST | `/auth/logout` | Bearer | `{ ok: true }` |
| POST | `/votes` | Bearer | body `{ entryId }` → `201 { ok: true, entryId, votes }` · `409 { message, votedEntryId }` ถ้าโหวตไปแล้ว |
| GET | `/admin/stats` | Bearer (admin) | `{ totalVotes, voters, updatedAt, entries: [{ id, title, author, image, votes }] }` |

ใน `/auth/line` ฝั่ง backend ต้องทำสามอย่าง: แลก `code` + `code_verifier` กับ `https://api.line.me/oauth2/v2.1/token` (ใช้ channel secret), verify ID token พร้อมเช็ก `nonce` แล้วจึงออก session token ของระบบเอง ฝั่ง frontend ไม่เคยถือ channel secret

`width`/`height` ของภาพใช้กันการ์ดกระโดดตอนภาพโหลด และช่วยรักษาสัดส่วนภาพ

## กติกา UX ที่โค้ดบังคับไว้

- หน้าจอจะแสดงว่าโหวตสำเร็จ (ติ๊กถูก + confetti) ก็ต่อเมื่อ `POST /votes` ตอบ `ok: true` แล้วเท่านั้น ถ้าล้มเหลวจะเขย่าเฉพาะส่วนปุ่มและแสดงข้อความ error
- Login ผ่าน LINE OAuth (PKCE + state + nonce) เท่านั้น ไม่มีปุ่มลัดที่ทำให้ดูเหมือน login แล้ว
- ถ้าเครื่องผู้ใช้ตั้ง `prefers-reduced-motion` ไว้ animation ที่วนไม่รู้จบจะหยุด และ parallax จะปิด

## โครงสร้าง

```
src/
  config.js            ชื่อแอป, tagline, env
  styles/tokens.css    ชุดสี + light/dark
  styles/app.css       คอมโพเนนต์ + keyframes
  lib/                 api, lineAuth (PKCE), router, motion presets, theme
  state/session.jsx    ผู้ใช้ + สถานะโหวต
  components/          Logo3D, AmbientScene, Hero, EntryCard, DetailView, ConfirmDialog, Celebration ...
  pages/               Home, Login, AuthCallback, Admin
mock/plugin.js         mock backend (dev เท่านั้น)
public/                manifest, icons, service worker
```
