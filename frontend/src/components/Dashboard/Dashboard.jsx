import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  LogOut, Zap, ChevronRight, AlertCircle,
  CheckCircle2, Loader2, User, BarChart3, FileText, Target, Settings, Mail, Camera
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import UploadPanel from './UploadPanel'
import PDFPreview from './PDFPreview'

const STEPS = [
  { id: 'upload', label: 'Upload Resume', icon: FileText },
  { id: 'optimize', label: 'Add Job Description', icon: Target },
  { id: 'result', label: 'View Result', icon: BarChart3 },
]

export default function Dashboard() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const profileMenuRef = useRef(null)

  const [step, setStep] = useState('upload')
  const [resumeUploaded, setResumeUploaded] = useState(false)
  const [pdflatexAvailable, setPdflatexAvailable] = useState(false)
  const [jobDesc, setJobDesc] = useState('')
  const [optimizing, setOptimizing] = useState(false)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    profilePhoto: user?.profilePhoto || ''
  })

  const [result, setResult] = useState({
    pdfBase64: null,
    atsScore: 0,
    keywords: [],
    status: 'idle',
    optimizedLatex: null,
    compileError: null
  })

  useEffect(() => {
    api.get('/resume/status').then(({ data }) => {
      setPdflatexAvailable(data.pdflatexAvailable)
      if (data.resume) {
        setResumeUploaded(true)
        setStep('optimize')
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        profilePhoto: user.profilePhoto || ''
      })
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = e => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => { logout(); navigate('/') }

  const handleOpenProfile = () => {
    setMenuOpen(false)
    setProfileError('')
    setProfileSuccess('')
    setProfileModalOpen(true)
  }

  const handleProfileSave = async e => {
    e.preventDefault()
    if (!profileForm.name.trim() || profileForm.name.trim().length < 2) {
      setProfileError('Username must be at least 2 characters')
      return
    }

    setProfileError('')
    setProfileSuccess('')
    setProfileSaving(true)
    try {
      const payload = {
        name: profileForm.name.trim(),
        profilePhoto: profileForm.profilePhoto.trim()
      }
      const { data } = await api.put('/auth/profile', payload)
      updateUser(data.user)
      setProfileSuccess('Profile updated successfully')
      setTimeout(() => setProfileModalOpen(false), 700)
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Could not update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleUploaded = () => {
    setResumeUploaded(true)
    setStep('optimize')
  }

  const handleOptimize = async () => {
    if (!jobDesc.trim() || jobDesc.trim().length < 20) {
      setError('Please enter a job description (at least 20 characters)')
      return
    }
    setError('')
    setOptimizing(true)
    try {
      const { data } = await api.post('/resume/optimize', { jobDescription: jobDesc })
      setResult({
        pdfBase64: data.pdfBase64,
        atsScore: data.atsScore,
        keywords: data.keywords,
        status: data.status,
        optimizedLatex: data.optimizedLatex,
        compileError: data.compileError
      })
      setStep('result')
    } catch (err) {
      setError(err.response?.data?.message || 'Optimization failed. Please try again.')
    } finally {
      setOptimizing(false)
    }
  }

  const activeStep = STEPS.findIndex(s => s.id === step)

  return (
    <div className="h-screen bg-surface-0 flex flex-col overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[400px] h-[300px] bg-brand-600/6 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-violet-600/5 rounded-full blur-[80px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-50 flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] glass shrink-0">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Go to home page">
          <div className="w-7 h-7 rounded-lg overflow-hidden shadow-glow-sm ring-1 ring-white/10">
            <img src="/Resume.AI.jpeg" alt="Resume.AI logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-base font-bold text-white">Resume<span className="gradient-text">.AI</span></span>
        </Link>

        {/* Step indicator */}
        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {STEPS.map((s, i) => {
            const done = i < activeStep
            const active = i === activeStep
            const Icon = s.icon
            return (
              <div key={s.id} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${active ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30' : done ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {done ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  {s.label}
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700" />}
              </div>
            )
          })}
        </div>

        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-white/[0.06] hover:border-brand-500/40 transition-colors"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center ring-1 ring-white/10">
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-semibold text-white">{(user?.name || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="text-xs text-slate-400 hidden sm:block">{user?.name}</span>
            <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${menuOpen ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute right-0 mt-2 w-64 glass-card border border-white/[0.08] p-2 z-[60]"
              >
                <div className="px-3 py-2 border-b border-white/[0.06]">
                  <p className="text-xs text-slate-400">Signed in as</p>
                  <p className="text-sm text-white font-medium truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleOpenProfile}
                  className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] text-left text-sm text-slate-300"
                >
                  <Settings className="w-4 h-4" />
                  Profile Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-left text-sm text-red-300"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Left Panel — Controls */}
        <div className="w-[380px] shrink-0 flex flex-col border-r border-white/[0.06] overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Section 1: Upload */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                  ${resumeUploaded ? 'bg-emerald-500 text-white' : 'bg-brand-600/20 text-brand-400 border border-brand-500/30'}`}>
                  {resumeUploaded ? '✓' : '1'}
                </div>
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Upload Resume</span>
              </div>
              <UploadPanel onUploaded={handleUploaded} />
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.06]" />

            {/* Section 2: Job Description */}
            <div className={`transition-opacity ${!resumeUploaded ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                  ${step === 'result' ? 'bg-emerald-500 text-white' : resumeUploaded ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'bg-white/[0.04] text-slate-600 border border-white/[0.08]'}`}>
                  {step === 'result' ? '✓' : '2'}
                </div>
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Job Description</span>
              </div>

              <textarea
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
                placeholder="Paste the full job description here...&#10;&#10;Example:&#10;We are looking for a Senior React Developer with 3+ years experience in TypeScript, Node.js, REST APIs..."
                className="input-field w-full h-40 resize-none text-xs font-mono leading-relaxed"
                disabled={!resumeUploaded || optimizing}
              />

              <div className="flex items-center justify-between mt-2 mb-3">
                <span className="text-xs text-slate-700">{jobDesc.length} characters</span>
                {jobDesc.length > 0 && jobDesc.length < 20 && (
                  <span className="text-xs text-yellow-600">Need at least 20 chars</span>
                )}
              </div>

              {error && (
                <motion.div
                  className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-3"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <div className="whitespace-pre-line flex-1">{error}</div>
                </motion.div>
              )}

              <button
                onClick={handleOptimize}
                disabled={!resumeUploaded || optimizing || jobDesc.trim().length < 20}
                className="btn-primary w-full justify-center"
              >
                {optimizing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Optimizing with AI...</>
                ) : (
                  <><Zap className="w-4 h-4" /> Optimize Resume</>
                )}
              </button>

              {optimizing && (
                <div className="mt-3 space-y-1.5">
                  {[
                    'Extracting ATS keywords from job description...',
                    'Analyzing resume structure...',
                    'Injecting keywords strategically...',
                    'Compiling to PDF...'
                  ].map((msg, i) => (
                    <motion.div
                      key={msg}
                      className="flex items-center gap-2 text-xs text-slate-600"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.8 }}
                    >
                      <div className="w-1 h-1 rounded-full bg-brand-500 animate-pulse" />
                      {msg}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* ATS Score mini display */}
            {result.atsScore > 0 && (
              <>
                <div className="h-px bg-white/[0.06]" />
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ATS Score</span>
                    <span className={`text-xl font-black ${result.atsScore >= 80 ? 'text-emerald-400' : result.atsScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {result.atsScore}<span className="text-xs text-slate-600 font-normal">/100</span>
                    </span>
                  </div>
                  {/* Score bar */}
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full progress-bar`}
                      initial={{ width: 0 }}
                      animate={{ width: `${result.atsScore}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-700">0</span>
                    <span className="text-xs text-slate-700">100</span>
                  </div>

                  {/* Keywords */}
                  {result.keywords.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-600 mb-2">Injected Keywords:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.keywords.map(kw => (
                          <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/15">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Panel — PDF Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <PDFPreview
            pdfBase64={result.pdfBase64}
            atsScore={result.atsScore}
            keywords={result.keywords}
            status={result.status}
            optimizedLatex={result.optimizedLatex}
            pdflatexAvailable={pdflatexAvailable}
            compileError={result.compileError}
          />
        </div>
      </div>

      <AnimatePresence>
        {profileModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="w-full max-w-md glass-card p-6 border border-white/[0.08]"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-white">Profile Settings</h3>
                <button
                  onClick={() => setProfileModalOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Profile Photo URL</label>
                  <div className="relative">
                    <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      value={profileForm.profilePhoto}
                      onChange={e => setProfileForm(prev => ({ ...prev, profilePhoto: e.target.value }))}
                      placeholder="https://example.com/photo.jpg"
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      value={profileForm.name}
                      onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                      className="input-field pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input value={user?.email || ''} className="input-field pl-10 opacity-70" disabled />
                  </div>
                </div>

                {profileError && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {profileError}
                  </div>
                )}

                {profileSuccess && (
                  <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    {profileSuccess}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(false)}
                    className="btn-secondary flex-1 justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="btn-primary flex-1 justify-center"
                  >
                    {profileSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
