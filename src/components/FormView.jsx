import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from './Button.jsx'
import ConfirmBox from './ConfirmBox.jsx'
import Celebration from './Celebration.jsx'
import DriveImg from './DriveImg.jsx'
import ResultBars from './ResultBars.jsx'
import { api } from '../lib/api.js'
import { navigate } from '../lib/router.js'
import { store } from '../lib/storage.js'
import { rise, shake, softSpring, stagger } from '../lib/motion.js'

const draftKey = (id) => `vt-draft-${id}`

function ChoiceQuestion({ q, value, onChange, disabled }) {
  const multi = q.type === 'multi'
  const picked = multi ? value || [] : value
  const withImages = q.options.some((o) => o.imageId)
  const toggle = (id) => {
    if (disabled) return
    if (!multi) return onChange(id)
    onChange((prev = []) => {
      const has = prev.includes(id)
      if (!has && q.max && prev.length >= q.max) return prev
      return has ? prev.filter((x) => x !== id) : [...prev, id]
    })
  }
  return (
    <div className={withImages ? 'choice-grid' : 'choice-list'} role={multi ? 'group' : 'radiogroup'}>
      {q.options.map((o) => {
        const on = multi ? picked.includes(o.id) : picked === o.id
        return (
          <motion.button
            key={o.id}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={on}
            className={`choice${on ? ' is-on' : ''}`}
            onClick={() => toggle(o.id)}
            whileTap={{ scale: 0.97 }}
            animate={on ? { y: -2 } : { y: 0 }}
            transition={softSpring}
          >
            {o.imageId && (
              <span className="choice-img">
                <DriveImg id={o.imageId} alt={o.label} />
              </span>
            )}
            <span className="choice-row">
              <span className={`choice-mark ${multi ? 'is-box' : ''}`} aria-hidden="true">
                {on && (
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25 }} />
                  </svg>
                )}
              </span>
              <span className="choice-label">{o.label || 'ตัวเลือกรูปภาพ'}</span>
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

function Rating({ value, onChange, disabled }) {
  return (
    <div className="rating" role="radiogroup" aria-label="ให้คะแนน 1 ถึง 5">
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} คะแนน`}
          className={`star${value >= n ? ' is-on' : ''}`}
          onClick={() => !disabled && onChange(n)}
          whileTap={{ scale: 0.85 }}
        >
          ★
        </motion.button>
      ))}
    </div>
  )
}

function answerText(q, a) {
  if (a === undefined || a === null || a === '') return '—'
  const label = (id) => q.options.find((o) => o.id === id)?.label || 'รูปภาพ'
  if (q.type === 'single') return label(a)
  if (q.type === 'multi') return a.map(label).join(', ')
  if (q.type === 'rating') return `${a} / 5`
  return a
}

// Forms/polls built in the app: answer once, then see your answers (and results if the admin allows).
export default function FormView({ campaign }) {
  const [data, setData] = useState(null)
  const [answers, setAnswers] = useState(() => {
    try {
      return JSON.parse(store.get(draftKey(campaign.id)) || '{}')
    } catch {
      return {}
    }
  })
  const [error, setError] = useState('')
  const [missing, setMissing] = useState(null)
  const [shakeKey, setShakeKey] = useState(0)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const refs = useRef({})

  const load = useCallback(async () => {
    setError('')
    try {
      setData(await api.form(campaign.id))
    } catch (err) {
      setError(err.message)
    }
  }, [campaign.id])

  useEffect(() => {
    load()
  }, [load])

  const setAnswer = (qid, v) => {
    setAnswers((prev) => {
      const next = { ...prev, [qid]: typeof v === 'function' ? v(prev[qid]) : v }
      store.set(draftKey(campaign.id), JSON.stringify(next))
      return next
    })
    if (missing === qid) setMissing(null)
  }

  const firstMissing = () =>
    data.questions.find((q) => {
      if (!q.required) return false
      const a = answers[q.id]
      return a === undefined || a === null || a === '' || (Array.isArray(a) && !a.length)
    })

  const requestSubmit = () => {
    const m = firstMissing()
    if (m) {
      setMissing(m.id)
      setShakeKey((k) => k + 1)
      refs.current[m.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setConfirm(true)
  }

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api.submitResponse(campaign.id, answers)
      if (!res?.ok) throw new Error('เซิร์ฟเวอร์ยังไม่ยืนยันการบันทึกคำตอบ')
      store.set(draftKey(campaign.id), null)
      setConfirm(false)
      setData((d) => ({ ...d, myAnswers: res.answers, results: res.results }))
      setCelebrate(true)
      scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setConfirm(false)
      if (err.status === 401) return navigate('/login')
      if (err.status === 409) return load()
      if (err.data?.questionId) {
        setMissing(err.data.questionId)
        setShakeKey((k) => k + 1)
        refs.current[err.data.questionId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !data) {
    return (
      <div className="empty">
        <p>{error}</p>
        <Button variant="ghost" onClick={load}>
          ลองโหลดใหม่
        </Button>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="form-stack">
        {[0, 1, 2].map((i) => (
          <div key={i} className="q-card shimmer" style={{ height: 150 }} />
        ))}
      </div>
    )
  }
  if (!data.questions.length) {
    return (
      <div className="empty">
        <p>ยังไม่มีคำถามในกิจกรรมนี้</p>
      </div>
    )
  }

  if (data.myAnswers) {
    return (
      <div className="form-stack">
        <motion.div className="answered-banner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <b>ส่งคำตอบแล้ว ขอบคุณที่ร่วมกิจกรรม</b>
          <span>1 บัญชี LINE ตอบได้ 1 ครั้ง</span>
        </motion.div>
        {data.results ? (
          <ResultBars results={data.results} />
        ) : (
          <div className="q-card">
            <h3 className="q-title">คำตอบของคุณ</h3>
            <dl className="my-answers">
              {data.questions.map((q, i) => (
                <div key={q.id}>
                  <dt>
                    {i + 1}. {q.title}
                  </dt>
                  <dd>{answerText(q, data.myAnswers[q.id])}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <AnimatePresence>
          {celebrate && <Celebration key="done" title="ส่งคำตอบแล้ว" message="ขอบคุณที่ร่วมตอบ ทุกเสียงมีความหมาย" onDone={() => setCelebrate(false)} />}
        </AnimatePresence>
      </div>
    )
  }

  const closed = campaign.closed
  return (
    <motion.div className="form-stack" variants={stagger(0.06)} initial="hidden" animate="show">
      {data.questions.map((q, i) => (
        <motion.section
          key={q.id}
          ref={(el) => (refs.current[q.id] = el)}
          variants={rise}
          className={`q-card${missing === q.id ? ' is-missing' : ''}`}
        >
          <motion.div key={missing === q.id ? shakeKey : 'still'} animate={missing === q.id ? shake : undefined}>
            <h3 className="q-title">
              <span className="q-no">{i + 1}</span>
              {q.title}
              {q.required && <span className="q-req" aria-label="จำเป็น">*</span>}
            </h3>
            {q.description && <p className="q-desc">{q.description}</p>}
            {q.type === 'multi' && <p className="q-hint">{q.max ? `เลือกได้ไม่เกิน ${q.max} ข้อ` : 'เลือกได้หลายข้อ'}</p>}
            {q.imageId && (
              <div className="q-image">
                <DriveImg id={q.imageId} size="l" alt="" />
              </div>
            )}
            {(q.type === 'single' || q.type === 'multi') && (
              <ChoiceQuestion q={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} disabled={closed} />
            )}
            {q.type === 'text' && (
              <textarea
                className="q-text"
                rows={3}
                maxLength={1000}
                value={answers[q.id] || ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder="พิมพ์คำตอบ"
                disabled={closed}
              />
            )}
            {q.type === 'rating' && <Rating value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} disabled={closed} />}
            {missing === q.id && <p className="form-error">ข้อนี้จำเป็นต้องตอบ</p>}
          </motion.div>
        </motion.section>
      ))}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-submit">
        {closed ? (
          <p className="vote-note">ปิดรับคำตอบแล้ว</p>
        ) : (
          <Button size="lg" className="btn-block" onClick={requestSubmit}>
            ส่งคำตอบ
          </Button>
        )}
      </div>

      <AnimatePresence>
        {confirm && (
          <ConfirmBox key="confirm" title="ส่งคำตอบเลยไหม?" confirmLabel="ส่งคำตอบ" busy={busy} onConfirm={submit} onCancel={() => setConfirm(false)}>
            <p>1 บัญชี LINE ตอบได้ 1 ครั้ง และแก้ไขภายหลังไม่ได้</p>
          </ConfirmBox>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
