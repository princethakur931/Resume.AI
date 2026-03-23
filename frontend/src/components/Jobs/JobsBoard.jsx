import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Briefcase,
  Building2,
  CalendarClock,
  CircleCheckBig,
  Eye,
  GraduationCap,
  Sparkles,
  Timer,
  UserCheck,
  UserRound,
  X,
  XCircle
} from 'lucide-react'
import api from '../../services/api'

const DEFAULT_COMPANY_PHOTO = '/job-icon.jpg'

function formatEndDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function getDaysLeft(endDate) {
  const now = new Date()
  const end = new Date(endDate)
  const diffMs = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export default function JobsBoard() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [applyingFor, setApplyingFor] = useState('')
  const [hoveredJobId, setHoveredJobId] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)

  const totalJobs = useMemo(() => jobs.length, [jobs])
  const appliedJobs = useMemo(() => jobs.filter(job => job.hasApplied).length, [jobs])

  useEffect(() => {
    let cancelled = false

    const loadJobs = async () => {
      setLoading(true)
      setError('')
      setNotice('')
      try {
        const { data } = await api.get('/jobs')
        if (!cancelled) setJobs(data.jobs || [])
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Unable to load jobs right now.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadJobs()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (selectedJob) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [selectedJob])

  const applyJob = async job => {
    const jobId = job._id
    setApplyingFor(jobId)
    setError('')
    setNotice('')

    try {
      const { data } = await api.post(`/jobs/${jobId}/apply`)
      const wasAlreadyApplied = Boolean(data?.alreadyApplied)

      if (!wasAlreadyApplied) {
        setJobs(prev => prev.map(currentJob => (
          currentJob._id === jobId
            ? { ...currentJob, hasApplied: true, applicantsCount: (currentJob.applicantsCount || 0) + 1 }
            : currentJob
        )))
      }

      setNotice(data?.message || 'Redirecting to application page...')
      const redirectUrl = data?.redirectUrl || job.applyUrl
      if (redirectUrl) {
        window.location.href = redirectUrl
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Application failed. Please retry.')
    } finally {
      setApplyingFor('')
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-5%] w-[560px] h-[560px] bg-cyan-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[5%] right-[-10%] w-[560px] h-[560px] bg-brand-600/12 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-20%] left-[30%] w-[640px] h-[640px] bg-emerald-600/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:22px_22px]" />
      </div>

      <header className="relative z-20 border-b border-white/[0.08] glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden ring-1 ring-white/10 flex-shrink-0">
              <img src="/Resume.AI.jpeg" alt="Resume.AI logo" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-[0.2em]">Hiring Board</p>
              <h1 className="text-sm sm:text-lg font-bold text-white leading-tight whitespace-nowrap">Live Job Openings</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to="/dashboard" className="btn-primary !rounded-lg !text-[11px] sm:!text-xs !px-2.5 sm:!px-4 !py-1.5 sm:!py-2 whitespace-nowrap transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/50">Back to Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-6 transition-all duration-300 hover:border-brand-400/30 hover:shadow-[0_0_40px_rgba(139,92,246,0.24)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="section-badge mb-3"><Sparkles className="w-3.5 h-3.5" /> Apply directly from Resume.AI</p>
              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">Curated Jobs For You</h2>
              <p className="text-sm text-slate-400 mt-2">Admin-posted verified opportunities. One click and your application is submitted.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-xl px-4 py-3 border border-white/10 transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_32px_rgba(139,92,246,0.22)]">
                <p className="text-xs uppercase text-slate-500 tracking-widest">Open Roles</p>
                <p className="text-2xl font-black text-cyan-300 mt-1">{totalJobs}</p>
              </div>
              <div className="glass rounded-xl px-4 py-3 border border-white/10 transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_32px_rgba(139,92,246,0.22)]">
                <p className="text-xs uppercase text-slate-500 tracking-widest">You Applied</p>
                <p className="text-2xl font-black text-emerald-300 mt-1">{appliedJobs}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {error && (
          <div className="mb-5 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-5 p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 text-sm">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="glass-card p-6 animate-pulse">
                <div className="h-5 bg-white/[0.08] rounded w-1/2 mb-4" />
                <div className="h-4 bg-white/[0.06] rounded w-1/3 mb-2" />
                <div className="h-4 bg-white/[0.06] rounded w-2/3 mb-2" />
                <div className="h-20 bg-white/[0.05] rounded mt-4" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Briefcase className="w-9 h-9 text-slate-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white">No jobs available right now</h3>
            <p className="text-sm text-slate-500 mt-2">Please check back soon. New roles are posted frequently.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {jobs.map((job, index) => {
              const daysLeft = getDaysLeft(job.endDate)
              const isApplying = applyingFor === job._id

              return (
                <motion.article
                  key={job._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onMouseEnter={() => setHoveredJobId(job._id)}
                  onMouseLeave={() => setHoveredJobId(null)}
                  className={`glass-card p-6 border relative overflow-hidden transition-all duration-300 cursor-pointer ${
                    hoveredJobId === job._id
                      ? 'border-cyan-400/60 shadow-lg shadow-cyan-500/50'
                      : 'border-white/[0.1]'
                  }`}
                >
                  <div className={`absolute -top-20 -right-16 w-52 h-52 rounded-full blur-2xl transition-all duration-300 ${
                    hoveredJobId === job._id
                      ? 'bg-gradient-to-br from-cyan-500/40 to-brand-500/20'
                      : 'bg-gradient-to-br from-cyan-500/20 to-brand-500/0'
                  }`} />
                  <div className="relative flex flex-col h-full">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-14 h-14 rounded-xl bg-white p-1.5 ring-1 ring-white/10 grid place-items-center flex-shrink-0">
                          <img
                            src={job.companyPhoto || DEFAULT_COMPANY_PHOTO}
                            alt={job.companyName}
                            className="w-full h-full rounded-lg object-contain"
                            onError={e => {
                              e.currentTarget.src = DEFAULT_COMPANY_PHOTO
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-white leading-tight">Job Role: {job.jobRole}</h3>
                          <p className="text-xs text-slate-500">Company: {job.companyName}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs border border-amber-400/30 bg-amber-400/10 text-amber-300 inline-flex items-center gap-1 flex-shrink-0">
                        <Timer className="w-3 h-3" /> {daysLeft} days left
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mt-4">
                      <div className="glass rounded-lg p-2 border border-white/[0.08] text-slate-300 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-brand-300 flex-shrink-0" />
                        Batch/Education: {job.batchOrEducation}
                      </div>
                      <div className="glass rounded-lg p-2 border border-white/[0.08] text-slate-300 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
                        Experience: {job.experience}
                      </div>
                    </div>

                    <div className="mt-4 flex-1 min-h-0">
                      <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 break-words [overflow-wrap:anywhere]">Job Description: {job.jobDescription}</p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-slate-500 inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Deadline: {formatEndDate(job.endDate)}</p>
                          <p className="text-xs text-slate-300 inline-flex items-center gap-1"><UserRound className="w-3.5 h-3.5" /> {job.applicantsCount || 0} applicants</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => setSelectedJob(job)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-400/30 bg-slate-500/10 text-slate-300 transition-all hover:border-slate-400/50 hover:bg-slate-500/20"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                          onClick={() => applyJob(job)}
                          disabled={isApplying}
                          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                            job.hasApplied
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'btn-primary'
                          }`}
                        >
                          {isApplying ? (
                            <>Applying...</>
                          ) : job.hasApplied ? (
                          <><CircleCheckBig className="w-4 h-4" /> Applied</>
                        ) : (
                          <><UserCheck className="w-4 h-4" /> Apply Now</>
                        )}
                      </button>
                      </div>
                    </div>
                  </div>
                </div>
                </motion.article>
              )
            })}
          </div>
        )}
      </main>

      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-4 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto hide-scrollbar border border-brand-400/20 rounded-2xl"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-white p-2 ring-1 ring-white/10 grid place-items-center">
                  <img
                    src={selectedJob.companyPhoto || DEFAULT_COMPANY_PHOTO}
                    alt={selectedJob.companyName}
                    className="w-full h-full rounded object-contain"
                    onError={e => {
                      e.currentTarget.src = DEFAULT_COMPANY_PHOTO
                    }}
                  />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white break-words [overflow-wrap:anywhere]">{selectedJob.jobRole}</h2>
                  <p className="text-sm text-slate-400 mt-1">{selectedJob.companyName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="glass rounded-lg p-4 border border-white/[0.08] transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_24px_rgba(139,92,246,0.2)]">
                  <p className="text-xs text-slate-500 uppercase">Batch / Education: <span className="text-white font-semibold">{selectedJob.batchOrEducation}</span></p>
                </div>
                <div className="glass rounded-lg p-4 border border-white/[0.08] transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_24px_rgba(139,92,246,0.2)]">
                  <p className="text-xs text-slate-500 uppercase">Experience: <span className="text-white font-semibold">{selectedJob.experience}</span></p>
                </div>
                <div className="glass rounded-lg p-4 border border-white/[0.08] transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_24px_rgba(139,92,246,0.2)]">
                  <p className="text-xs text-slate-500 uppercase">Deadline: <span className="text-white font-semibold">{formatEndDate(selectedJob.endDate)}</span></p>
                </div>
                <div className="glass rounded-lg p-4 border border-white/[0.08] transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_24px_rgba(139,92,246,0.2)]">
                  <p className="text-xs text-slate-500 uppercase">Days Left: <span className="text-white font-semibold">{getDaysLeft(selectedJob.endDate)} days</span></p>
                </div>
              </div>

              <div className="glass rounded-lg p-4 border border-white/[0.08] transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_28px_rgba(139,92,246,0.22)]">
                <p className="text-xs text-slate-500 uppercase mb-2">Complete Job Description</p>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{selectedJob.jobDescription}</p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="flex-1 btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    applyJob(selectedJob)
                    setSelectedJob(null)
                  }}
                  className="flex-1 btn-primary"
                >
                  Apply Now
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
