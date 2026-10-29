import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../../components/Button.jsx'
import DriveImg from '../../components/DriveImg.jsx'
import { api } from '../../lib/api.js'
import { primeImage } from '../../lib/images.js'
import { resizeImage } from '../../lib/resize.js'
import { shake, spring } from '../../lib/motion.js'

const TYPES = [
  ['single', 'ตัวเลือกเดียว'],
  ['multi', 'หลายตัวเลือก'],
  ['text', 'ข้อความ'],
  ['rating', 'ให้คะแนน 1–5'],
]

let seq = 0
const key = () => `k${++seq}`
const blankOption = () => ({ _k: key(), id: '', label: '', imageId: '' })
const blankQuestion = (type = 'single') => ({
  _k: key(),
  id: '',
  type,
  title: '',
  description: '',
  required: true,
  imageId: '',
  options: [blankOption(), blankOption()],
  max: 0,
})
const withKeys = (qs) => qs.map((q) => ({ ...q, _k: key(), options: (q.options || []).map((o) => ({ ...o, _k: key() })) }))

// Picks a photo, shrinks it, uploads it to the campaign's Drive folder and returns its file id.
function ImagePicker({ campaignId, imageId, onChange, small, disabled }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pick = async (file) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const img = await resizeImage(file, small ? 900 : 1600)
      const res = await api.uploadImage({ campaignId, image: img.dataUrl, width: img.width, height: img.height })
      primeImage(res.imageId, img.dataUrl)
      onChange(res.imageId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`img-picker${small ? ' is-small' : ''}`}>
      {imageId ? (
        <div className="img-picker-preview">
          <DriveImg id={imageId} alt="" />
          {!disabled && (
            <button type="button" className="img-remove" onClick={() => onChange('')} aria-label="เอารูปออก">
              ×
            </button>
          )}
        </div>
      ) : (
        <button type="button" className="img-add" onClick={() => ref.current?.click()} disabled={busy || disabled}>
          {busy ? (
            <span className="spinner" aria-hidden="true" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <circle cx="9" cy="11" r="2" />
              <path d="M21 16l-5-5-6 7" />
            </svg>
          )}
          {!small && <span>{busy ? 'กำลังอัปโหลด…' : 'เพิ่มรูป'}</span>}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => (pick(e.target.files[0]), (e.target.value = ''))} />
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}

export default function FormBuilder({ campaignId }) {
  const [questions, setQuestions] = useState(null)
  const [responses, setResponses] = useState(0)
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [errKey, setErrKey] = useState(0)
  const locked = responses > 0

  useEffect(() => {
    api.campaignQuestions(campaignId).then(
      (d) => {
        setQuestions(d.questions.length ? withKeys(d.questions) : [blankQuestion()])
        setResponses(d.responses)
      },
      (err) => setError(err.message),
    )
  }, [campaignId])

  // Always derive from the latest state: image uploads finish later than the render that started them.
  const patchQ = (k, change) => {
    setState('idle')
    setQuestions((qs) => qs.map((q) => (q._k === k ? { ...q, ...(typeof change === 'function' ? change(q) : change) } : q)))
  }
  const patchO = (qk, ok, change) =>
    patchQ(qk, (q) => ({ options: q.options.map((o) => (o._k === ok ? { ...o, ...change } : o)) }))
  const move = (k, dir) =>
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q._k === k)
      const j = i + dir
      if (j < 0 || j >= qs.length) return qs
      const next = [...qs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const duplicate = (k) =>
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q._k === k)
      const copy = { ...qs[i], _k: key(), id: '', options: qs[i].options.map((o) => ({ ...o, _k: key(), id: '' })) }
      return [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)]
    })

  const save = async () => {
    setState('saving')
    setError('')
    try {
      const saved = await api.saveQuestions(
        campaignId,
        questions.map(({ _k, options, ...q }) => ({ ...q, options: options.map(({ _k: _o, ...o }) => o) })),
      )
      setQuestions(withKeys(saved))
      setState('saved')
    } catch (err) {
      setState('idle')
      setError(err.message)
      setErrKey((k) => k + 1)
    }
  }

  if (!questions) {
    return error ? <p className="form-error">{error}</p> : <div className="entry-manager shimmer" style={{ height: 220 }} />
  }

  return (
    <section className="entry-manager">
      <div className="settings-head">
        <h3>คำถาม ({questions.length})</h3>
        <p>{locked ? `มีคนตอบแล้ว ${responses} คน แก้คำถามไม่ได้ ถ้าต้องการเปลี่ยนให้สร้างกิจกรรมใหม่` : 'สร้างคำถามได้หลายข้อ ใส่รูปได้ทั้งที่คำถามและตัวเลือก'}</p>
      </div>

      <AnimatePresence initial={false}>
        {questions.map((q, i) => (
          <motion.div key={q._k} layout className="qb-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={spring}>
            <div className="qb-top">
              <span className="q-no">{i + 1}</span>
              <div className="qb-types" role="radiogroup" aria-label="ประเภทคำถาม">
                {TYPES.map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={q.type === t}
                    className={`chip${q.type === t ? ' is-on' : ''}`}
                    onClick={() => patchQ(q._k, (cur) => ({ type: t, options: cur.options.length >= 2 ? cur.options : [blankOption(), blankOption()] }))}
                    disabled={locked}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span>คำถาม</span>
              <input value={q.title} onChange={(e) => patchQ(q._k, { title: e.target.value })} placeholder="เช่น ชอบชุดไหนที่สุด" disabled={locked} />
            </label>
            <label className="field">
              <span>คำอธิบาย (ไม่บังคับ)</span>
              <input value={q.description} onChange={(e) => patchQ(q._k, { description: e.target.value })} disabled={locked} />
            </label>
            <div className="field">
              <span className="field-label">รูปประกอบคำถาม (ไม่บังคับ)</span>
              <ImagePicker campaignId={campaignId} imageId={q.imageId} onChange={(id) => patchQ(q._k, { imageId: id })} disabled={locked} />
            </div>

            {(q.type === 'single' || q.type === 'multi') && (
              <div className="qb-options">
                <span className="field-label">ตัวเลือก (ใส่ข้อความ รูป หรือทั้งสองอย่าง)</span>
                {q.options.map((o, oi) => (
                  <div key={o._k} className="qb-option">
                    <span className={`choice-mark ${q.type === 'multi' ? 'is-box' : ''}`} aria-hidden="true" />
                    <input
                      value={o.label}
                      onChange={(e) => patchO(q._k, o._k, { label: e.target.value })}
                      placeholder={`ตัวเลือกที่ ${oi + 1}`}
                      disabled={locked}
                    />
                    <ImagePicker small campaignId={campaignId} imageId={o.imageId} onChange={(id) => patchO(q._k, o._k, { imageId: id })} disabled={locked} />
                    {!locked && q.options.length > 2 && (
                      <button type="button" className="icon-btn" aria-label="ลบตัวเลือก" onClick={() => patchQ(q._k, (cur) => ({ options: cur.options.filter((x) => x._k !== o._k) }))}>
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {!locked && (
                  <button type="button" className="back-link" onClick={() => patchQ(q._k, (cur) => ({ options: [...cur.options, blankOption()] }))}>
                    + เพิ่มตัวเลือก
                  </button>
                )}
                {q.type === 'multi' && (
                  <label className="field qb-max">
                    <span>เลือกได้สูงสุด (0 = ไม่จำกัด)</span>
                    <input type="number" min="0" max={q.options.length} value={q.max} onChange={(e) => patchQ(q._k, { max: Number(e.target.value) || 0 })} disabled={locked} />
                  </label>
                )}
              </div>
            )}

            <div className="qb-foot">
              <label className="check">
                <input type="checkbox" checked={q.required} onChange={(e) => patchQ(q._k, { required: e.target.checked })} disabled={locked} />
                <span>จำเป็นต้องตอบ</span>
              </label>
              {!locked && (
                <div className="qb-tools">
                  <button type="button" className="icon-btn" aria-label="เลื่อนขึ้น" onClick={() => move(q._k, -1)} disabled={i === 0}>
                    ↑
                  </button>
                  <button type="button" className="icon-btn" aria-label="เลื่อนลง" onClick={() => move(q._k, 1)} disabled={i === questions.length - 1}>
                    ↓
                  </button>
                  <button type="button" className="icon-btn" aria-label="ทำซ้ำคำถาม" onClick={() => duplicate(q._k)}>
                    ⧉
                  </button>
                  {questions.length > 1 && (
                    <button type="button" className="link-danger" onClick={() => setQuestions((qs) => qs.filter((x) => x._k !== q._k))}>
                      ลบ
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {!locked && (
        <>
          <button type="button" className="dropzone" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>
            <b>+ เพิ่มคำถาม</b>
          </button>
          <AnimatePresence>
            {error && (
              <motion.p key={errKey} className="form-error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1, ...shake }} exit={{ opacity: 0 }}>
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          <div className="settings-actions">
            {state === 'saved' && <span className="pill pill-success">บันทึกคำถามแล้ว</span>}
            <Button onClick={save} disabled={state === 'saving'}>
              {state === 'saving' ? (
                <>
                  <span className="spinner" aria-hidden="true" /> กำลังบันทึก…
                </>
              ) : (
                'บันทึกคำถาม'
              )}
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
