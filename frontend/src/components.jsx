import { NavLink, Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { useCallback, useRef, useState } from 'react'
import { useAuth, useTheme } from './contexts'
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE_MB, formatBytes, detectFileType } from './lib'
import {
  LayoutDashboard, UploadCloud, Search, PenSquare, BookMarked, StickyNote,
  Settings, LogOut, GraduationCap, Sun, Moon, Menu, X, AlertTriangle,
  Loader2, FileText,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Layout (sidebar + top bar shell)
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/upload', label: 'Upload Paper', icon: UploadCloud },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/practice', label: 'Practice / Test', icon: PenSquare },
  { to: '/bookmarks', label: 'Bookmarks', icon: BookMarked },
  { to: '/mistakes', label: 'Mistake Notebook', icon: AlertTriangle },
  { to: '/notes', label: 'Notes', icon: StickyNote },
]

export function Layout() {
  const { profile, signOut, isAdmin } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const doSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm shadow-brand-600/40">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-extrabold text-sm leading-tight">MCQ Prep System</p>
          <p className="text-[11px] text-slate-400">FPSC · CSS · NTS · STS</p>
        </div>
      </div>
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/settings"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </NavLink>
        )}
      </nav>
      <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 px-1 mb-3">
          <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 flex items-center justify-center text-xs font-bold">
            {(profile?.full_name || profile?.email || '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{profile?.full_name || 'Student'}</p>
            <p className="text-[11px] text-slate-400 truncate">{profile?.role === 'admin' ? 'Admin' : 'Student'}</p>
          </div>
        </div>
        <button onClick={toggleTheme} className="btn-secondary w-full mb-2 justify-start">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button onClick={doSignOut} className="btn-ghost w-full justify-start text-danger-600 dark:text-danger-500">
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <SidebarContent />
      </aside>

      <div className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm">MCQ Prep System</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="btn-ghost !px-2">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 bg-white dark:bg-slate-900 flex flex-col h-full shadow-xl">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 btn-ghost !px-2">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProtectedRoute
// ---------------------------------------------------------------------------
export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

// ---------------------------------------------------------------------------
// FileDropzone
// ---------------------------------------------------------------------------
export function FileDropzone({ files, onFilesSelected, onRemove }) {
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  const handleFiles = useCallback(
    (fileList) => {
      const accepted = []
      const rejected = []
      for (const file of Array.from(fileList)) {
        const type = detectFileType(file)
        const tooBig = file.size > MAX_FILE_SIZE_MB * 1024 * 1024
        if (!type || tooBig) {
          rejected.push({ name: file.name, reason: tooBig ? `over ${MAX_FILE_SIZE_MB}MB` : 'unsupported type' })
        } else {
          accepted.push(file)
        }
      }
      onFilesSelected(accepted, rejected)
    },
    [onFilesSelected]
  )

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragActive
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
            : 'border-slate-300 dark:border-slate-700 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-900'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-100 dark:bg-brand-500/10 flex items-center justify-center mb-4">
          <UploadCloud className="h-7 w-7 text-brand-600" />
        </div>
        <p className="font-semibold">Drag & drop your paper here, or click to browse</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          PDF, image (scanned paper), Word (.docx), Excel (.xlsx) or plain text — up to {MAX_FILE_SIZE_MB}MB each, unlimited papers.
        </p>
      </div>

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-brand-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(f.size)}</p>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onRemove(i) }} className="btn-ghost !p-1.5">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------
const ACCENTS = {
  brand: 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-500',
  success: 'bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-500',
  warning: 'bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-500',
  danger: 'bg-danger-50 dark:bg-danger-500/10 text-danger-600 dark:text-danger-500',
}

export function StatCard({ label, value, icon: Icon, accent = 'brand', sub }) {
  const accentClasses = ACCENTS[accent] || ACCENTS.brand
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && (
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${accentClasses}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="text-3xl font-extrabold mt-2 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}
