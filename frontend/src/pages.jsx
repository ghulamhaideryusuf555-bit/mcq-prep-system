import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom'
import { supabase, api, sha256Hex, detectFileType } from './lib'
import { useAuth } from './contexts'
import { FileDropzone, StatCard } from './components'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  GraduationCap, Loader2, FileStack, Target, Flame, AlertTriangle, UploadCloud,
  PenSquare, TrendingUp, CheckCircle2, XCircle, ArrowRight, Trash2, Sparkles,
  ArrowLeft, Search as SearchIcon, Bookmark, StickyNote, Clock, Shuffle, BookOpen,
  Trophy, Flag, MinusCircle, RotateCcw, Save, KeyRound, ShieldCheck,
} from 'lucide-react'

/* ============================================================================
   Login
============================================================================ */
export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || '/'

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-brand-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30 mb-4">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">MCQ Prep System</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">FPSC · CSS · NTS · STS past papers, mastered.</p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <h2 className="text-lg font-bold">Welcome back</h2>
          {error && <p className="text-sm text-danger-600 bg-danger-50 dark:bg-danger-500/10 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Password</label>
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </button>
          <p className="text-sm text-center text-slate-500 dark:text-slate-400">
            No account? <Link to="/signup" className="text-brand-600 font-semibold hover:underline">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

/* ============================================================================
   Signup
============================================================================ */
export function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-brand-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30 mb-4">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">MCQ Prep System</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create your account to start practicing.</p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <h2 className="text-lg font-bold">Create account</h2>
          {error && <p className="text-sm text-danger-600 bg-danger-50 dark:bg-danger-500/10 rounded-lg px-3 py-2">{error}</p>}
          {done && (
            <p className="text-sm text-success-700 bg-success-50 dark:bg-success-500/10 dark:text-success-500 rounded-lg px-3 py-2">
              Account created! Check your email if confirmation is required, then sign in. Redirecting…
            </p>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Full name</label>
            <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Password</label>
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account
          </button>
          <p className="text-sm text-center text-slate-500 dark:text-slate-400">
            Already have an account? <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

/* ============================================================================
   Dashboard
============================================================================ */
export function Dashboard() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState({ papers: 0, questions: 0, attempts: 0, accuracy: 0 })
  const [subjectPerf, setSubjectPerf] = useState([])
  const [weakTopics, setWeakTopics] = useState([])
  const [recentPapers, setRecentPapers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let mounted = true
    ;(async () => {
      const [papersRes, attemptsRes, perfRes, papersListRes] = await Promise.all([
        supabase.from('papers').select('id, total_questions', { count: 'exact' }).eq('uploaded_by', user.id),
        supabase.from('user_attempts').select('*').eq('user_id', user.id).not('completed_at', 'is', null),
        supabase.from('v_user_subject_performance').select('*').eq('user_id', user.id),
        supabase.from('papers').select('id, title, status, total_questions, created_at').eq('uploaded_by', user.id).order('created_at', { ascending: false }).limit(5),
      ])

      if (!mounted) return

      const totalQuestions = (papersRes.data || []).reduce((sum, p) => sum + (p.total_questions || 0), 0)
      const attempts = attemptsRes.data || []
      const totalCorrect = attempts.reduce((s, a) => s + (a.correct_count || 0), 0)
      const totalAnswered = attempts.reduce((s, a) => s + (a.correct_count || 0) + (a.wrong_count || 0), 0)

      setStats({
        papers: papersRes.count || 0,
        questions: totalQuestions,
        attempts: attempts.length,
        accuracy: totalAnswered ? Math.round((100 * totalCorrect) / totalAnswered) : 0,
      })

      const perf = (perfRes.data || []).filter((p) => p.subject_name)
      setSubjectPerf(perf.map((p) => ({ name: p.subject_name, accuracy: Number(p.accuracy_percent) || 0 })))
      setWeakTopics(perf.filter((p) => p.accuracy_percent !== null && p.accuracy_percent < 60).sort((a, b) => a.accuracy_percent - b.accuracy_percent).slice(0, 5))
      setRecentPapers(papersListRes.data || [])
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [user])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Here's where your prep stands today.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/upload" className="btn-secondary"><UploadCloud className="h-4 w-4" /> Upload Paper</Link>
          <Link to="/practice" className="btn-primary"><PenSquare className="h-4 w-4" /> Start Practice</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Papers imported" value={stats.papers} icon={FileStack} accent="brand" />
        <StatCard label="Questions in library" value={stats.questions} icon={Target} accent="success" />
        <StatCard label="Attempts completed" value={stats.attempts} icon={Flame} accent="warning" />
        <StatCard label="Overall accuracy" value={`${stats.accuracy}%`} icon={TrendingUp} accent="brand" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <h2 className="font-bold mb-4">Accuracy by subject</h2>
          {subjectPerf.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">No attempts yet — start a practice session to see your breakdown here.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={subjectPerf} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <Bar dataKey="accuracy" fill="#3b66f5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-bold mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning-500" /> Weak topics</h2>
          {weakTopics.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing flagged yet.</p>
          ) : (
            <ul className="space-y-3">
              {weakTopics.map((t) => (
                <li key={t.subject_name} className="flex items-center justify-between text-sm">
                  <span>{t.subject_name}</span>
                  <span className="badge-danger">{t.accuracy_percent}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Recent papers</h2>
          <Link to="/upload" className="text-sm text-brand-600 font-semibold hover:underline">Upload another</Link>
        </div>
        {recentPapers.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No papers uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentPapers.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <p className="text-xs text-slate-400">{p.total_questions} questions</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={
                    p.status === 'imported' ? 'badge-success' : p.status === 'review' ? 'badge-warning' : p.status === 'failed' ? 'badge-danger' : 'badge-neutral'
                  }>{p.status}</span>
                  {p.status !== 'processing' && (
                    <Link to={`/review/${p.id}`} className="text-sm text-brand-600 font-semibold hover:underline">Open</Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {loading && null}
    </div>
  )
}

/* ============================================================================
   Upload
============================================================================ */
const STATUS_LABEL = {
  queued: 'Queued',
  hashing: 'Checking for duplicates…',
  duplicate: 'Already in your library',
  uploading: 'Uploading…',
  extracting: 'OCR / AI extracting MCQs…',
  ready: 'Ready to review',
  failed: 'Failed',
}

export function Upload() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [statuses, setStatuses] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [orgId, setOrgId] = useState('')
  const [examName, setExamName] = useState('')
  const [year, setYear] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    supabase.from('organizations').select('*').order('code').then(({ data }) => {
      setOrganizations(data || [])
      if (data?.length) setOrgId(data.find((o) => o.code !== 'OTHER')?.id || data[0].id)
    })
  }, [])

  const onFilesSelected = (accepted, rejected) => {
    setFiles((prev) => [...prev, ...accepted])
    setStatuses((prev) => [...prev, ...accepted.map(() => ({ status: 'queued' }))])
    if (rejected.length) {
      alert(`Skipped ${rejected.length} file(s): ${rejected.map((r) => `${r.name} (${r.reason})`).join(', ')}`)
    }
  }

  const onRemove = (i) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
    setStatuses((prev) => prev.filter((_, idx) => idx !== i))
  }

  const updateStatus = (i, patch) => {
    setStatuses((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }

  const processAll = async () => {
    setProcessing(true)
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]
      if (statuses[i]?.status === 'ready' || statuses[i]?.status === 'duplicate') continue

      try {
        updateStatus(i, { status: 'hashing', error: null })
        const fileType = detectFileType(file)
        const hash = await sha256Hex(file)

        const { data: existing } = await supabase.from('papers').select('id, title, status').eq('file_hash', hash).maybeSingle()
        if (existing) {
          updateStatus(i, { status: 'duplicate', paperId: existing.id })
          continue
        }

        updateStatus(i, { status: 'uploading' })
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
        const { error: uploadErr } = await supabase.storage.from('papers').upload(path, file, { upsert: false })
        if (uploadErr) throw new Error(uploadErr.message)

        const { data: paper, error: insertErr } = await supabase
          .from('papers')
          .insert({
            title: file.name.replace(/\.[^.]+$/, ''),
            organization_id: orgId || null,
            exam_name: examName || null,
            year: year ? Number(year) : null,
            file_path: path,
            file_type: fileType,
            file_hash: hash,
            uploaded_by: user.id,
            status: 'processing',
          })
          .select('id')
          .single()
        if (insertErr) throw new Error(insertErr.message)

        updateStatus(i, { status: 'extracting', paperId: paper.id })
        const result = await api.extractPaper({ paperId: paper.id })
        updateStatus(i, { status: 'ready', paperId: paper.id, questionCount: result.questionCount, needsReviewCount: result.needsReviewCount })
      } catch (err) {
        updateStatus(i, { status: 'failed', error: err.message })
      }
    }
    setProcessing(false)
  }

  const anyReady = statuses.some((s) => s.status === 'ready')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Upload Paper</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Upload one or many past papers. Each is OCR/AI-read, split into questions, options and answers, then queued for your review before anything is saved permanently.
        </p>
      </div>

      <div className="card p-5 grid sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Organization</label>
          <select className="input" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>{o.code}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Exam name (optional)</label>
          <input className="input" value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="e.g. CSS Screening Test" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Year (optional)</label>
          <input className="input" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2023" />
        </div>
      </div>

      <div className="card p-5">
        <FileDropzone files={files} onFilesSelected={onFilesSelected} onRemove={onRemove} />
      </div>

      {files.length > 0 && (
        <div className="card p-5 space-y-3">
          <h2 className="font-bold">Import queue</h2>
          {files.map((f, i) => {
            const s = statuses[i] || {}
            return (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-xs text-slate-400">
                    {STATUS_LABEL[s.status] || 'Queued'}
                    {s.status === 'ready' && ` — ${s.questionCount} MCQs detected${s.needsReviewCount ? `, ${s.needsReviewCount} need review` : ''}`}
                    {s.status === 'failed' && s.error ? `: ${s.error}` : ''}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {['hashing', 'uploading', 'extracting'].includes(s.status) && <Loader2 className="h-5 w-5 animate-spin text-brand-600" />}
                  {s.status === 'ready' && <CheckCircle2 className="h-5 w-5 text-success-500" />}
                  {s.status === 'duplicate' && <AlertTriangle className="h-5 w-5 text-warning-500" />}
                  {s.status === 'failed' && <XCircle className="h-5 w-5 text-danger-500" />}
                  {(s.status === 'ready' || s.status === 'duplicate') && s.paperId && (
                    <button onClick={() => navigate(`/review/${s.paperId}`)} className="btn-secondary !py-1.5 !px-3 text-xs">
                      Review <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          <div className="pt-2 flex gap-3">
            <button className="btn-primary" disabled={processing || files.length === 0} onClick={processAll}>
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              {processing ? 'Processing…' : 'Start OCR / AI extraction'}
            </button>
            {anyReady && (
              <button className="btn-secondary" onClick={() => navigate('/')}>
                Done for now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================================
   ReviewImport
============================================================================ */
const CONFIDENCE_BADGE = {
  high: 'badge-success',
  medium: 'badge-warning',
  low: 'badge-danger',
}

function QuestionCard({ q, subjects, onChange, onDelete, onSolve, solving }) {
  const options = [...q.options].sort((a, b) => a.option_label.localeCompare(b.option_label))
  const explanation = q.explanations?.[0]

  const setCorrect = (label) => {
    const updated = options.map((o) => ({ ...o, is_correct: o.option_label === label }))
    onChange({ ...q, options: updated })
  }

  const setSubject = (subjectId) => onChange({ ...q, subject_id: subjectId })

  return (
    <div className={`card p-5 space-y-4 ${q.needs_review ? 'ring-2 ring-warning-500/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge-neutral">#{q.question_number ?? '—'}</span>
          {q.confidence && <span className={CONFIDENCE_BADGE[q.confidence] || 'badge-neutral'}>Confidence: {q.confidence}</span>}
          {q.has_answer_key ? <span className="badge-brand">From answer key</span> : <span className="badge-neutral">AI-determined</span>}
          {q.needs_review && <span className="badge-warning flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Review required</span>}
        </div>
        <button onClick={() => onDelete(q.id)} className="btn-ghost !p-1.5 text-danger-600">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {q.needs_review && q.review_reason && (
        <p className="text-xs text-warning-700 dark:text-warning-500 bg-warning-50 dark:bg-warning-500/10 rounded-lg px-3 py-2">{q.review_reason}</p>
      )}

      <textarea
        className="input min-h-[60px]"
        value={q.question_text}
        onChange={(e) => onChange({ ...q, question_text: e.target.value })}
      />

      <div className="space-y-2">
        {options.map((o) => (
          <label
            key={o.option_label}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer transition ${
              o.is_correct
                ? 'border-success-500 bg-success-50 dark:bg-success-500/10'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <input type="radio" name={`correct-${q.id}`} checked={o.is_correct} onChange={() => setCorrect(o.option_label)} />
            <span className="font-semibold text-sm w-5">{o.option_label}</span>
            <input
              className="flex-1 bg-transparent text-sm focus:outline-none"
              value={o.option_text}
              onChange={(e) => {
                const updated = options.map((opt) => (opt.option_label === o.option_label ? { ...opt, option_text: e.target.value } : opt))
                onChange({ ...q, options: updated })
              }}
            />
            {o.is_correct && <CheckCircle2 className="h-4 w-4 text-success-500 shrink-0" />}
          </label>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Subject</label>
          <select className="input !py-2 text-sm" value={q.subject_id || ''} onChange={(e) => setSubject(e.target.value)}>
            <option value="">— none —</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={() => onSolve(q.id)} disabled={solving} className="btn-secondary w-full">
            {solving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Solve / Re-verify with AI
          </button>
        </div>
      </div>

      {explanation?.explanation_text && (
        <div className="text-sm bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
          <p className="font-semibold mb-1">Explanation</p>
          <p className="text-slate-600 dark:text-slate-300">{explanation.explanation_text}</p>
        </div>
      )}
    </div>
  )
}

export function ReviewImport() {
  const { paperId } = useParams()
  const navigate = useNavigate()
  const [paper, setPaper] = useState(null)
  const [questions, setQuestions] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [solvingId, setSolvingId] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: paperData }, { data: qData }, { data: subjData }] = await Promise.all([
      supabase.from('papers').select('*').eq('id', paperId).single(),
      supabase.from('questions').select('*, options(*), explanations(*)').eq('paper_id', paperId).order('question_number'),
      supabase.from('subjects').select('*').order('name'),
    ])
    setPaper(paperData)
    setQuestions(qData || [])
    setSubjects(subjData || [])
    setLoading(false)
  }, [paperId])

  useEffect(() => {
    load()
  }, [load])

  const updateQuestion = (updated) => {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)))
  }

  const deleteQuestion = async (id) => {
    if (!confirm('Remove this question from the import?')) return
    await supabase.from('questions').delete().eq('id', id)
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const solve = async (id) => {
    setSolvingId(id)
    try {
      await api.verifyAnswer({ questionId: id, applyResult: true })
      const { data } = await supabase.from('questions').select('*, options(*), explanations(*)').eq('id', id).single()
      if (data) updateQuestion(data)
    } catch (err) {
      alert(err.message)
    } finally {
      setSolvingId(null)
    }
  }

  const saveEdits = async () => {
    setSaving(true)
    try {
      for (const q of questions) {
        await supabase.from('questions').update({
          question_text: q.question_text,
          subject_id: q.subject_id || null,
        }).eq('id', q.id)
        for (const o of q.options) {
          await supabase.from('options').update({ option_text: o.option_text, is_correct: o.is_correct }).eq('id', o.id)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const confirmImport = async () => {
    await saveEdits()
    try {
      const result = await api.importPaper({ paperId })
      alert(`Imported ${result.importedQuestions} questions${result.duplicatesFound ? ` (${result.duplicatesFound} flagged as repeats of existing questions)` : ''}.`)
      navigate('/')
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!paper) return <p>Paper not found.</p>

  const filtered = questions.filter((q) => {
    if (filter === 'review') return q.needs_review
    if (filter === 'high') return q.confidence === 'high'
    return true
  })

  const reviewCount = questions.filter((q) => q.needs_review).length

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/upload')} className="btn-ghost !px-2 text-sm">
        <ArrowLeft className="h-4 w-4" /> Back to upload
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{paper.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {questions.length} questions detected
            {reviewCount > 0 && <span className="text-warning-600 dark:text-warning-500 font-medium"> · {reviewCount} need review</span>}
            {' · '}status: <span className="font-medium">{paper.status}</span>
          </p>
        </div>
        {paper.status === 'review' && (
          <button onClick={confirmImport} disabled={saving} className="btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Import ({questions.length})
          </button>
        )}
        {paper.status === 'imported' && <span className="badge-success">Already imported</span>}
      </div>

      <div className="flex gap-2">
        {[
          { key: 'all', label: `All (${questions.length})` },
          { key: 'review', label: `Review Required (${reviewCount})` },
          { key: 'high', label: 'High confidence' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={filter === f.key ? 'btn-primary !py-1.5 !px-3 text-xs' : 'btn-secondary !py-1.5 !px-3 text-xs'}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((q) => (
          <QuestionCard
            key={q.id}
            q={q}
            subjects={subjects}
            onChange={updateQuestion}
            onDelete={deleteQuestion}
            onSolve={solve}
            solving={solvingId === q.id}
          />
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-500 text-center py-10">No questions in this filter.</p>}
      </div>
    </div>
  )
}

/* ============================================================================
   SearchPage
============================================================================ */
const TABS = [
  { key: 'all', label: 'Show All' },
  { key: 'unsolved', label: 'Unsolved' },
  { key: 'wrong', label: 'Wrong' },
  { key: 'important', label: 'Important' },
  { key: 'repeated', label: 'Repeated' },
  { key: 'doubtful', label: 'Doubtful' },
]

export function SearchPage() {
  const { user } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [orgId, setOrgId] = useState('')
  const [year, setYear] = useState('')
  const [tab, setTab] = useState('all')
  const [subjects, setSubjects] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [bookmarked, setBookmarked] = useState(new Set())

  useEffect(() => {
    supabase.from('subjects').select('*').order('name').then(({ data }) => setSubjects(data || []))
    supabase.from('organizations').select('*').order('code').then(({ data }) => setOrganizations(data || []))
  }, [])

  const runSearch = useCallback(async () => {
    setLoading(true)

    let excludeIds = null
    let includeIds = null

    if (tab === 'unsolved') {
      const { data: answered } = await supabase.from('attempt_answers').select('question_id, user_attempts!inner(user_id)').eq('user_attempts.user_id', user.id)
      excludeIds = (answered || []).map((a) => a.question_id)
    } else if (tab === 'wrong') {
      const { data: mistakes } = await supabase.from('v_mistake_notebook').select('question_id').eq('user_id', user.id)
      includeIds = (mistakes || []).map((m) => m.question_id)
    } else if (tab === 'important') {
      const { data: bm } = await supabase.from('bookmarks').select('question_id').eq('user_id', user.id)
      includeIds = (bm || []).map((b) => b.question_id)
    }

    let q = supabase
      .from('questions')
      .select('*, options(*), papers!inner(status, title)')
      .eq('papers.status', 'imported')
      .order('created_at', { ascending: false })
      .limit(50)

    if (keyword.trim()) q = q.ilike('question_text', `%${keyword.trim()}%`)
    if (subjectId) q = q.eq('subject_id', subjectId)
    if (orgId) q = q.eq('organization_id', orgId)
    if (year) q = q.eq('year', Number(year))
    if (tab === 'repeated') q = q.not('is_duplicate_of', 'is', null)
    if (tab === 'doubtful') q = q.eq('needs_review', true)
    if (includeIds) q = q.in('id', includeIds.length ? includeIds : ['00000000-0000-0000-0000-000000000000'])
    if (excludeIds && excludeIds.length) q = q.not('id', 'in', `(${excludeIds.join(',')})`)

    const { data, error } = await q
    if (!error) setResults(data || [])

    const { data: bm } = await supabase.from('bookmarks').select('question_id').eq('user_id', user.id)
    setBookmarked(new Set((bm || []).map((b) => b.question_id)))

    setLoading(false)
  }, [keyword, subjectId, orgId, year, tab, user])

  useEffect(() => {
    runSearch()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleBookmark = async (questionId) => {
    if (bookmarked.has(questionId)) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('question_id', questionId)
      setBookmarked((prev) => { const n = new Set(prev); n.delete(questionId); return n })
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, question_id: questionId })
      setBookmarked((prev) => new Set(prev).add(questionId))
    }
  }

  const addNote = async (questionId) => {
    const text = window.prompt('Add a note for this question:')
    if (!text) return
    await supabase.from('notes').upsert(
      { user_id: user.id, question_id: questionId, note_text: text, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,question_id' }
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Search</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Search across every imported question by keyword, subject, organization or year.</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search question text…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Any subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            <option value="">Any organization</option>
            {organizations.map((o) => <option key={o.id} value={o.id}>{o.code}</option>)}
          </select>
          <input className="input" placeholder="Year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={runSearch}>Search</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? 'btn-primary !py-1.5 !px-3 text-xs' : 'btn-secondary !py-1.5 !px-3 text-xs'}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
      ) : results.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-16">No questions found.</p>
      ) : (
        <div className="space-y-3">
          {results.map((q) => (
            <div key={q.id} className="card p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="badge-neutral">{q.papers?.title}</span>
                  {q.needs_review && <span className="badge-warning">Doubtful</span>}
                  {q.is_duplicate_of && <span className="badge-brand">Repeated</span>}
                  {q.confidence && <span className="badge-neutral">Confidence: {q.confidence}</span>}
                </div>
                <p className="text-sm font-medium">{q.question_text}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => addNote(q.id)} className="btn-ghost !p-1.5">
                  <StickyNote className="h-4 w-4" />
                </button>
                <button onClick={() => toggleBookmark(q.id)} className="btn-ghost !p-1.5">
                  <Bookmark className={`h-4 w-4 ${bookmarked.has(q.id) ? 'fill-brand-600 text-brand-600' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================================
   Practice (setup)
============================================================================ */
const MODES = [
  { key: 'practice', label: 'Practice Mode', desc: 'No timer. See feedback as you go.', icon: BookOpen },
  { key: 'test', label: 'Timed Test', desc: 'Timed, results shown at the end.', icon: Clock },
  { key: 'mock', label: 'Mock Exam', desc: 'Full-length timed simulation.', icon: Trophy },
  { key: 'random', label: 'Random Shuffle', desc: 'Random mix across your whole library.', icon: Shuffle },
]

export function Practice() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('practice')
  const [organizations, setOrganizations] = useState([])
  const [subjects, setSubjects] = useState([])
  const [papers, setPapers] = useState([])
  const [orgId, setOrgId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [paperId, setPaperId] = useState('')
  const [count, setCount] = useState(20)
  const [timerMinutes, setTimerMinutes] = useState(20)
  const [available, setAvailable] = useState(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    supabase.from('organizations').select('*').order('code').then(({ data }) => setOrganizations(data || []))
    supabase.from('subjects').select('*').order('name').then(({ data }) => setSubjects(data || []))
    supabase.from('papers').select('id, title').eq('status', 'imported').order('created_at', { ascending: false }).then(({ data }) => setPapers(data || []))
  }, [])

  useEffect(() => {
    setChecking(true)
    let q = supabase
      .from('questions')
      .select('id, papers!inner(status)', { count: 'exact', head: true })
      .is('is_duplicate_of', null)
      .eq('papers.status', 'imported')
    if (orgId) q = q.eq('organization_id', orgId)
    if (subjectId) q = q.eq('subject_id', subjectId)
    if (paperId) q = q.eq('paper_id', paperId)
    q.then(({ count }) => {
      setAvailable(count || 0)
      setChecking(false)
    })
  }, [orgId, subjectId, paperId])

  const startSession = async () => {
    setLoading(true)
    let q = supabase
      .from('questions')
      .select('id, papers!inner(status)')
      .is('is_duplicate_of', null)
      .eq('papers.status', 'imported')
    if (orgId) q = q.eq('organization_id', orgId)
    if (subjectId) q = q.eq('subject_id', subjectId)
    if (paperId) q = q.eq('paper_id', paperId)
    const { data, error } = await q.limit(500)
    setLoading(false)
    if (error) return alert(error.message)
    if (!data || data.length === 0) return alert('No questions match these filters yet.')

    const shuffled = [...data].sort(() => Math.random() - 0.5)
    const ids = shuffled.slice(0, Math.min(count, shuffled.length)).map((r) => r.id)

    navigate('/practice/session', {
      state: {
        questionIds: ids,
        mode,
        subjectId: subjectId || null,
        paperId: paperId || null,
        timerMinutes: mode === 'test' || mode === 'mock' ? timerMinutes : null,
      },
    })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Practice / Test</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Build a custom test from your imported question library.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`card p-4 text-left transition ${mode === m.key ? 'ring-2 ring-brand-500' : 'hover:shadow-card-hover'}`}
          >
            <m.icon className="h-5 w-5 text-brand-600 mb-2" />
            <p className="font-semibold text-sm">{m.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
          </button>
        ))}
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Organization</label>
            <select className="input" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              <option value="">Any</option>
              {organizations.map((o) => <option key={o.id} value={o.id}>{o.code}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Subject</label>
            <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Any</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Specific paper</label>
            <select className="input" value={paperId} onChange={(e) => setPaperId(e.target.value)}>
              <option value="">Any</option>
              {papers.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Number of questions</label>
            <input type="number" min={1} max={200} className="input" value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </div>
          {(mode === 'test' || mode === 'mock') && (
            <div>
              <label className="text-sm font-medium mb-1 block">Timer (minutes)</label>
              <input type="number" min={1} max={240} className="input" value={timerMinutes} onChange={(e) => setTimerMinutes(Number(e.target.value))} />
            </div>
          )}
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          {checking ? 'Checking availability…' : `${available ?? '—'} matching questions available in your library.`}
        </p>

        <button className="btn-primary w-full" disabled={loading || available === 0} onClick={startSession}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenSquare className="h-4 w-4" />}
          Start
        </button>
      </div>
    </div>
  )
}

/* ============================================================================
   PracticeSession
============================================================================ */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function PracticeSession() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(state?.timerMinutes ? state.timerMinutes * 60 : null)
  const questionStartRef = useRef(Date.now())
  const startedAtRef = useRef(new Date().toISOString())

  const isPractice = state?.mode === 'practice'

  useEffect(() => {
    if (!state?.questionIds?.length) {
      navigate('/practice', { replace: true })
      return
    }
    ;(async () => {
      const { data } = await supabase
        .from('questions')
        .select('*, options(*), explanations(*)')
        .in('id', state.questionIds)
      const ordered = state.questionIds.map((id) => data.find((q) => q.id === id)).filter(Boolean)
      setQuestions(ordered)
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = useCallback(async () => {
    setSubmitting(true)
    const total = questions.length
    let correct = 0
    let wrong = 0
    let skipped = 0

    const attemptAnswers = questions.map((q) => {
      const ans = answers[q.id]
      const correctOption = q.options.find((o) => o.is_correct)
      if (!ans) {
        skipped += 1
        return { question_id: q.id, selected_option_id: null, is_correct: null, time_spent_seconds: 0 }
      }
      const isCorrect = correctOption && ans.optionId === correctOption.id
      if (isCorrect) correct += 1
      else wrong += 1
      return { question_id: q.id, selected_option_id: ans.optionId, is_correct: Boolean(isCorrect), time_spent_seconds: ans.timeSpent || 0 }
    })

    const durationSeconds = Math.round((Date.now() - new Date(startedAtRef.current).getTime()) / 1000)

    const { data: attempt, error } = await supabase
      .from('user_attempts')
      .insert({
        user_id: user.id,
        paper_id: state.paperId || null,
        subject_id: state.subjectId || null,
        mode: state.mode,
        total_questions: total,
        correct_count: correct,
        wrong_count: wrong,
        skipped_count: skipped,
        score_percent: total ? Math.round((1000 * correct) / total) / 10 : 0,
        duration_seconds: durationSeconds,
        started_at: startedAtRef.current,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      alert(error.message)
      setSubmitting(false)
      return
    }

    await supabase.from('attempt_answers').insert(attemptAnswers.map((a) => ({ ...a, attempt_id: attempt.id })))
    navigate(`/practice/results/${attempt.id}`, { replace: true })
  }, [answers, questions, state, user, navigate])

  useEffect(() => {
    if (secondsLeft === null || loading) return
    if (secondsLeft <= 0) {
      finish()
      return
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft, loading, finish])

  const current = questions[index]

  const selectOption = (optionId) => {
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 1000)
    setAnswers((prev) => ({ ...prev, [current.id]: { optionId, timeSpent } }))
  }

  const goTo = (i) => {
    questionStartRef.current = Date.now()
    setIndex(i)
  }

  const answeredCount = Object.keys(answers).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!current) return <p>No questions loaded.</p>

  const correctOption = current.options.find((o) => o.is_correct)
  const selected = answers[current.id]
  const showFeedback = isPractice && selected

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Question {index + 1} of {questions.length}</p>
          <div className="w-40 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-brand-600" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
          </div>
        </div>
        {secondsLeft !== null && (
          <div className={`flex items-center gap-2 font-mono font-bold ${secondsLeft < 60 ? 'text-danger-600' : ''}`}>
            <Clock className="h-4 w-4" /> {formatTime(secondsLeft)}
          </div>
        )}
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge-neutral">#{current.question_number ?? index + 1}</span>
          {current.needs_review && <span className="badge-warning flex items-center gap-1"><Flag className="h-3 w-3" /> Flagged for review</span>}
        </div>
        <p className="text-base font-medium leading-relaxed">{current.question_text}</p>

        <div className="space-y-2">
          {[...current.options].sort((a, b) => a.option_label.localeCompare(b.option_label)).map((o) => {
            let stateClasses = 'border-slate-200 dark:border-slate-800 hover:border-brand-400'
            if (showFeedback) {
              if (o.is_correct) stateClasses = 'border-success-500 bg-success-50 dark:bg-success-500/10'
              else if (selected?.optionId === o.id) stateClasses = 'border-danger-500 bg-danger-50 dark:bg-danger-500/10'
            } else if (selected?.optionId === o.id) {
              stateClasses = 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
            }
            return (
              <button
                key={o.id}
                onClick={() => selectOption(o.id)}
                disabled={showFeedback}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${stateClasses}`}
              >
                <span className="font-bold w-5">{o.option_label}</span>
                <span className="flex-1">{o.option_text}</span>
                {showFeedback && o.is_correct && <CheckCircle2 className="h-4 w-4 text-success-500" />}
              </button>
            )
          })}
        </div>

        {showFeedback && current.explanations?.[0]?.explanation_text && (
          <div className="text-sm bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4">
            <p className="font-semibold mb-1">Explanation</p>
            <p className="text-slate-600 dark:text-slate-300">{current.explanations[0].explanation_text}</p>
            {!correctOption && <p className="text-warning-600 mt-1">No confirmed correct answer for this question — marked for review.</p>}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button className="btn-secondary" disabled={index === 0} onClick={() => goTo(index - 1)}>Previous</button>
        <p className="text-sm text-slate-400">{answeredCount} / {questions.length} answered</p>
        {index < questions.length - 1 ? (
          <button className="btn-primary" onClick={() => goTo(index + 1)}>Next</button>
        ) : (
          <button className="btn-primary" disabled={submitting} onClick={finish}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Finish & See Results
          </button>
        )}
      </div>
    </div>
  )
}

/* ============================================================================
   Results
============================================================================ */
export function Results() {
  const { attemptId } = useParams()
  const { user } = useAuth()
  const [attempt, setAttempt] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookmarked, setBookmarked] = useState(new Set())

  useEffect(() => {
    ;(async () => {
      const [{ data: attemptData }, { data: answerRows }, { data: bm }] = await Promise.all([
        supabase.from('user_attempts').select('*').eq('id', attemptId).single(),
        supabase
          .from('attempt_answers')
          .select('*, questions(*, options(*), explanations(*))')
          .eq('attempt_id', attemptId),
        supabase.from('bookmarks').select('question_id').eq('user_id', user.id),
      ])
      setAttempt(attemptData)
      setRows(answerRows || [])
      setBookmarked(new Set((bm || []).map((b) => b.question_id)))
      setLoading(false)
    })()
  }, [attemptId, user])

  const toggleBookmark = async (questionId) => {
    if (bookmarked.has(questionId)) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('question_id', questionId)
      setBookmarked((prev) => { const n = new Set(prev); n.delete(questionId); return n })
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, question_id: questionId })
      setBookmarked((prev) => new Set(prev).add(questionId))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!attempt) return <p>Attempt not found.</p>

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card p-6 text-center">
        <p className="text-sm font-semibold text-slate-500">Result</p>
        <p className="text-5xl font-extrabold mt-2 tracking-tight text-brand-600">{attempt.score_percent}%</p>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <span className="flex items-center gap-1.5 text-success-600"><CheckCircle2 className="h-4 w-4" /> {attempt.correct_count} correct</span>
          <span className="flex items-center gap-1.5 text-danger-600"><XCircle className="h-4 w-4" /> {attempt.wrong_count} wrong</span>
          <span className="flex items-center gap-1.5 text-slate-400"><MinusCircle className="h-4 w-4" /> {attempt.skipped_count} skipped</span>
        </div>
        <Link to="/practice" className="btn-secondary mt-6 inline-flex">
          <RotateCcw className="h-4 w-4" /> New session
        </Link>
      </div>

      <div className="space-y-4">
        {rows.map((r) => {
          const q = r.questions
          const options = [...q.options].sort((a, b) => a.option_label.localeCompare(b.option_label))
          const explanation = q.explanations?.[0]
          return (
            <div key={r.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-sm">{q.question_text}</p>
                <button onClick={() => toggleBookmark(q.id)} className="btn-ghost !p-1.5 shrink-0">
                  <Bookmark className={`h-4 w-4 ${bookmarked.has(q.id) ? 'fill-brand-600 text-brand-600' : ''}`} />
                </button>
              </div>
              <div className="space-y-1.5">
                {options.map((o) => {
                  let cls = 'border-slate-200 dark:border-slate-800'
                  if (o.is_correct) cls = 'border-success-500 bg-success-50 dark:bg-success-500/10'
                  else if (r.selected_option_id === o.id) cls = 'border-danger-500 bg-danger-50 dark:bg-danger-500/10'
                  return (
                    <div key={o.id} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${cls}`}>
                      <span className="font-bold w-4">{o.option_label}</span>
                      <span>{o.option_text}</span>
                      {r.selected_option_id === o.id && <span className="ml-auto text-[10px] font-semibold uppercase">Your answer</span>}
                    </div>
                  )
                })}
              </div>
              {explanation?.explanation_text && (
                <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3">{explanation.explanation_text}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================================================================
   Bookmarks
============================================================================ */
export function Bookmarks() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('bookmarks')
      .select('id, question_id, questions(*, options(*), explanations(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (bookmarkId) => {
    await supabase.from('bookmarks').delete().eq('id', bookmarkId)
    setItems((prev) => prev.filter((i) => i.id !== bookmarkId))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Bookmarks</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Questions you've flagged as important for revision.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-16">No bookmarks yet. Star a question during practice or search to save it here.</p>
      ) : (
        <div className="space-y-3">
          {items.map((b) => {
            const q = b.questions
            const correct = q.options.find((o) => o.is_correct)
            return (
              <div key={b.id} className="card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{q.question_text}</p>
                  <button onClick={() => remove(b.id)} className="btn-ghost !p-1.5 shrink-0">
                    <Bookmark className="h-4 w-4 fill-brand-600 text-brand-600" />
                  </button>
                </div>
                {correct && <p className="text-xs text-success-600">Correct answer: {correct.option_label}. {correct.option_text}</p>}
                {q.explanations?.[0]?.explanation_text && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{q.explanations[0].explanation_text}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ============================================================================
   Mistakes
============================================================================ */
export function Mistakes() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data: mistakes } = await supabase
        .from('v_mistake_notebook')
        .select('*')
        .eq('user_id', user.id)
        .order('times_wrong', { ascending: false })

      if (!mistakes || mistakes.length === 0) {
        setItems([])
        setLoading(false)
        return
      }

      const { data: questions } = await supabase
        .from('questions')
        .select('*, options(*), explanations(*)')
        .in('id', mistakes.map((m) => m.question_id))

      const merged = mistakes
        .map((m) => ({ ...m, question: questions.find((q) => q.id === m.question_id) }))
        .filter((m) => m.question)

      setItems(merged)
      setLoading(false)
    })()
  }, [user])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Mistake Notebook</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Automatically built from questions you've answered incorrectly, worst-first.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-16">No mistakes recorded yet — nice work, or you haven't practiced yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((m) => {
            const q = m.question
            const correct = q.options.find((o) => o.is_correct)
            return (
              <div key={m.question_id} className="card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="badge-danger flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Missed {m.times_wrong}x</span>
                </div>
                <p className="text-sm font-medium">{q.question_text}</p>
                {correct && <p className="text-xs text-success-600">Correct answer: {correct.option_label}. {correct.option_text}</p>}
                {q.explanations?.[0]?.explanation_text && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{q.explanations[0].explanation_text}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ============================================================================
   Notes
============================================================================ */
export function Notes() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState({})
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('notes')
        .select('*, questions(question_text)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      setItems(data || [])
      setDrafts(Object.fromEntries((data || []).map((n) => [n.id, n.note_text])))
      setLoading(false)
    })()
  }, [user])

  const save = async (id) => {
    setSavingId(id)
    await supabase.from('notes').update({ note_text: drafts[id], updated_at: new Date().toISOString() }).eq('id', id)
    setSavingId(null)
  }

  const remove = async (id) => {
    await supabase.from('notes').delete().eq('id', id)
    setItems((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Notes</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Personal notes attached to specific questions. Add one from a question's detail view.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-16">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.id} className="card p-4 space-y-2">
              <p className="text-sm font-medium text-slate-500">{n.questions?.question_text}</p>
              <textarea
                className="input min-h-[70px]"
                value={drafts[n.id] || ''}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [n.id]: e.target.value }))}
              />
              <div className="flex gap-2">
                <button onClick={() => save(n.id)} disabled={savingId === n.id} className="btn-secondary !py-1.5 !px-3 text-xs">
                  {savingId === n.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                </button>
                <button onClick={() => remove(n.id)} className="btn-ghost !py-1.5 !px-3 text-xs text-danger-600">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================================
   Settings
============================================================================ */
const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)', modelHint: 'claude-sonnet-4-5' },
  { value: 'openai', label: 'OpenAI (GPT-4o)', modelHint: 'gpt-4o' },
  { value: 'google_vision', label: 'Google Cloud Vision (OCR only)', modelHint: '' },
]

export function Settings() {
  const [provider, setProvider] = useState('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.settingsStatus().then((res) => {
      setStatus(res.setting)
      if (res.setting?.provider) setProvider(res.setting.provider)
      if (res.setting?.model) setModel(res.setting.model)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await api.saveApiKey({ provider, apiKey, model: model || undefined })
      setStatus({ provider: res.provider, model: res.model, is_configured: true, updated_at: new Date().toISOString() })
      setApiKey('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure the AI/OCR provider used for extraction and answering. Admin only.</p>
      </div>

      <div className="card p-5 flex items-start gap-3 bg-brand-50/50 dark:bg-brand-500/5 border-brand-200 dark:border-brand-500/20">
        <ShieldCheck className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Keys are encrypted at rest in Supabase Vault and are only ever decrypted inside secure server-side functions.
          They are never sent to, or stored in, the browser — this form submits directly to a Netlify Function that writes the key server-side.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
      ) : (
        <>
          <div className="card p-5">
            <p className="text-sm font-semibold mb-1">Current status</p>
            {status?.is_configured ? (
              <p className="text-sm text-success-600 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> {status.provider} configured{status.model ? ` (${status.model})` : ''}</p>
            ) : (
              <p className="text-sm text-warning-600">No provider configured yet — uploads will fail to extract until a key is added.</p>
            )}
          </div>

          <form onSubmit={save} className="card p-5 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Provider</label>
              <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
                {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">API Key</label>
              <input className="input" type="password" required value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-…" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Model (optional override)</label>
              <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder={PROVIDERS.find((p) => p.value === provider)?.modelHint} />
            </div>
            {error && <p className="text-sm text-danger-600 bg-danger-50 dark:bg-danger-500/10 rounded-lg px-3 py-2">{error}</p>}
            <button className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Save key
            </button>
          </form>
        </>
      )}
    </div>
  )
}
