import { motion } from 'framer-motion'
import DriveImg from './DriveImg.jsx'
import { easeOut } from '../lib/motion.js'

const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0)

function Bar({ value, max, delay }) {
  return (
    <span className="rank-bar">
      <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: max ? value / max : 0 }} transition={{ duration: 0.8, delay, ease: easeOut }} />
    </span>
  )
}

// Per-question summary for forms (used after answering and in the admin dashboard).
export default function ResultBars({ results }) {
  return (
    <div className="result-list">
      {results.questions.map((q, qi) => (
        <section key={q.id} className="result-card">
          <h3>
            <span className="q-no">{qi + 1}</span> {q.title}
          </h3>
          <p className="result-meta">ตอบ {q.answered.toLocaleString('th-TH')} คน</p>

          {q.options && (
            <ol className="result-options">
              {q.options.map((o, i) => {
                const max = Math.max(...q.options.map((x) => x.count), 1)
                return (
                  <li key={o.id}>
                    {o.imageId && <DriveImg id={o.imageId} alt="" className="result-thumb" />}
                    <div className="result-body">
                      <div className="rank-top">
                        <b title={o.label}>{o.label || 'รูปภาพ'}</b>
                        <span>
                          {o.count.toLocaleString('th-TH')} · {pct(o.count, q.answered)}%
                        </span>
                      </div>
                      <Bar value={o.count} max={max} delay={0.1 + i * 0.04} />
                    </div>
                  </li>
                )
              })}
            </ol>
          )}

          {q.distribution && (
            <div className="rating-result">
              <div className="rating-avg">
                <b>{q.average.toFixed(1)}</b>
                <span>เฉลี่ยจาก 5</span>
              </div>
              <ol className="result-options">
                {[5, 4, 3, 2, 1].map((n, i) => (
                  <li key={n}>
                    <span className="rating-label">{n} ★</span>
                    <div className="result-body">
                      <Bar value={q.distribution[n - 1]} max={Math.max(...q.distribution, 1)} delay={0.1 + i * 0.04} />
                    </div>
                    <span className="rating-count">{q.distribution[n - 1]}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {q.texts && (
            <ul className="text-answers">
              {q.texts.length ? q.texts.map((t, i) => <li key={i}>{t}</li>) : <li className="muted">ยังไม่มีคำตอบ</li>}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
