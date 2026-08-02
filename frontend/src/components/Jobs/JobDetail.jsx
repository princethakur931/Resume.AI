import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleCheckBig,
  Clock,
  Copy,
  ExternalLink,
  GraduationCap,
  Linkedin,
  Loader2,
  Share2,
  Timer,
  UserCheck,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'
import api from '../../services/api'
import ProfileDropdown from '../Shared/ProfileDropdown'

const DEFAULT_COMPANY_PHOTO = '/job-icon.jpg'

function formatEndDate(date) {
  if (!date) return 'No deadline'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return 'No deadline'
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

function getDaysLeft(endDate) {
  if (!endDate) return null
  const now = new Date()
  const end = new Date(endDate)
  if (Number.isNaN(end.getTime())) return null
  const diffMs = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get(`/jobs/${id}`)
        if (!cancelled) setJob(data.job)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Job not found or no longer available.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const applyJob = async () => {
    if (!job) return
    setApplying(true)
    setError('')
    setNotice('')
    try {
      const { data } = await api.post(`/jobs/${job._id}/apply`)
      setJob(prev => ({ ...prev, hasApplied: true, applicantsCount: (prev.applicantsCount || 0) + (data?.alreadyApplied ? 0 : 1) }))
      setNotice(data?.message || 'Redirecting to application page...')
      const redirectUrl = data?.redirectUrl || job.applyUrl
      if (redirectUrl) setTimeout(() => { window.location.href = redirectUrl }, 800)
    } catch (err) {
      setError(err.response?.data?.message || 'Application failed. Please retry.')
    } finally {
      setApplying(false)
    }
  }

  const shareUrl = window.location.href
  const shareTitle = job ? `${job.jobRole} at ${job.companyName} — Apply on Resume.AI` : 'Job Opportunity on Resume.AI'

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Check out this job opportunity: ${shareTitle}`,
          url: shareUrl,
        })
      } catch (err) {
        if (err.name !== 'AbortError') copyLink()
      }
    } else {
      copyLink()
    }
  }

  const daysLeft = job ? getDaysLeft(job.endDate) : null

  return (
    <div className="min-h-screen bg-surface-0 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-5%] w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-[130px]" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-emerald-600/8 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:22px_22px]" />
      </div>

      <header className="relative z-50 flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] glass shrink-0 sticky top-0">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Go to home page">
          <div className="w-7 h-7 rounded-lg overflow-hidden shadow-glow-sm ring-1 ring-white/10">
            <img src="/Resume.AI.jpeg" alt="Resume.AI logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-base font-bold text-white">Resume<span className="gradient-text">.AI</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Jobs
          </Link>
          <ProfileDropdown />
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-5 animate-pulse">
            <div className="glass-card p-8">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-20 h-20 rounded-xl bg-white/[0.08]" />
                <div className="flex-1 space-y-3">
                  <div className="h-7 bg-white/[0.08] rounded w-2/3" />
                  <div className="h-4 bg-white/[0.06] rounded w-1/3" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-white/[0.05] rounded-xl" />
                ))}
              </div>
            </div>
            <div className="glass-card p-8">
              <div className="h-4 bg-white/[0.06] rounded w-1/4 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-white/[0.05] rounded w-full" />
                <div className="h-4 bg-white/[0.05] rounded w-5/6" />
                <div className="h-4 bg-white/[0.05] rounded w-4/5" />
                <div className="h-4 bg-white/[0.05] rounded w-full" />
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-10 text-center"
          >
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Job Not Available</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <Link to="/jobs" className="btn-primary inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Browse All Jobs
            </Link>
          </motion.div>
        )}

        {/* Job Detail */}
        {!loading && job && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Notices */}
            <AnimatePresence>
              {notice && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 text-sm flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {notice}
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hero Card */}
            <div className="glass-card p-6 sm:p-8 border border-white/[0.10] relative overflow-hidden">
              {/* Decorative glow */}
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-brand-500/20 to-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative flex flex-col sm:flex-row sm:items-start gap-5">
                {/* Company Logo */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-2 ring-1 ring-white/10 grid place-items-center flex-shrink-0 shadow-xl">
                  <img
                    src={job.companyPhoto || DEFAULT_COMPANY_PHOTO}
                    alt={job.companyName || 'Company'}
                    className="w-full h-full rounded-xl object-contain"
                    onError={e => { e.currentTarget.src = DEFAULT_COMPANY_PHOTO }}
                  />
                </div>

                {/* Title + Meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight break-words">
                        {job.jobRole || 'Job Role'}
                      </h2>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-base text-slate-300 font-medium">{job.companyName || 'Company'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Days left badge */}
                      {daysLeft === null ? (
                        <span className="px-3 py-1.5 rounded-full text-xs border border-slate-400/30 bg-slate-500/10 text-slate-300 inline-flex items-center gap-1.5">
                          <Timer className="w-3.5 h-3.5" /> No deadline
                        </span>
                      ) : daysLeft === 0 ? (
                        <span className="px-3 py-1.5 rounded-full text-xs border border-red-400/40 bg-red-500/10 text-red-300 inline-flex items-center gap-1.5">
                          <Timer className="w-3.5 h-3.5" /> Closing today
                        </span>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-full text-xs border inline-flex items-center gap-1.5 ${daysLeft <= 3 ? 'border-red-400/40 bg-red-500/10 text-red-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}>
                          <Timer className="w-3.5 h-3.5" /> {daysLeft} days left
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <UserRound className="w-3.5 h-3.5" />
                      <span>{job.applicantsCount || 0} applicants</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <CalendarClock className="w-3.5 h-3.5" />
                      <span>Deadline: {formatEndDate(job.endDate)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Posted recently</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="relative flex flex-col sm:flex-row gap-3 mt-6 pt-5 border-t border-white/[0.06]">
                {/* Apply */}
                <button
                  onClick={applyJob}
                  disabled={applying}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                    job.hasApplied
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
                      : 'btn-primary'
                  }`}
                >
                  {applying ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Applying...</>
                  ) : job.hasApplied ? (
                    <><CircleCheckBig className="w-4 h-4" /> Already Applied</>
                  ) : (
                    <><UserCheck className="w-4 h-4" /> Apply Now</>
                  )}
                </button>
                <button
                  id="share-btn"
                  onClick={handleShare}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:border-white/20 transition-all"
                >
                  {copied ? (
                    <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Copied Link</>
                  ) : (
                    <><Share2 className="w-4 h-4" /> Share Job</>
                  )}
                </button>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-5 border border-white/[0.08] hover:border-brand-400/30 hover:shadow-[0_0_28px_rgba(139,92,246,0.18)] transition-all duration-300"
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <GraduationCap className="w-4 h-4 text-brand-400" />
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Batch / Education</p>
                </div>
                <p className="text-white font-semibold text-base mt-2">{job.batchOrEducation || 'Not specified'}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass-card p-5 border border-white/[0.08] hover:border-cyan-400/30 hover:shadow-[0_0_28px_rgba(34,211,238,0.15)] transition-all duration-300"
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Experience Required</p>
                </div>
                <p className="text-white font-semibold text-base mt-2">{job.experience || 'Not specified'}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-5 border border-white/[0.08] hover:border-amber-400/30 hover:shadow-[0_0_28px_rgba(251,191,36,0.12)] transition-all duration-300"
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <CalendarClock className="w-4 h-4 text-amber-400" />
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Application Deadline</p>
                </div>
                <p className="text-white font-semibold text-base mt-2">{formatEndDate(job.endDate)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="glass-card p-5 border border-white/[0.08] hover:border-emerald-400/30 hover:shadow-[0_0_28px_rgba(52,211,153,0.12)] transition-all duration-300"
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <UserRound className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total Applicants</p>
                </div>
                <p className="text-white font-semibold text-base mt-2">{job.applicantsCount || 0} applied</p>
              </motion.div>
            </div>

            {/* Job Description */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6 sm:p-8 border border-white/[0.08] hover:border-brand-400/20 transition-all duration-300"
            >
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-brand-400" />
                Full Job Description
              </h3>
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap break-words text-[15px]">
                  {job.jobDescription || 'No description provided.'}
                </p>
              </div>
            </motion.div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="glass-card p-6 border border-brand-400/20 bg-gradient-to-br from-brand-500/5 to-cyan-500/5 text-center"
            >
              <h3 className="text-lg font-bold text-white mb-1">Ready to apply?</h3>
              <p className="text-sm text-slate-400 mb-4">
                Submit your application directly through Resume.AI
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={applyJob}
                  disabled={applying || job.hasApplied}
                  className={`inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all ${
                    job.hasApplied
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'btn-primary'
                  }`}
                >
                  {applying ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Applying...</>
                  ) : job.hasApplied ? (
                    <><CircleCheckBig className="w-4 h-4" /> Application Submitted</>
                  ) : (
                    <><UserCheck className="w-4 h-4" /> Apply Now</>
                  )}
                </button>
                <Link to="/jobs" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] transition-all">
                  <ArrowLeft className="w-4 h-4" /> Back to Jobs
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>


    </div>
  )
}
