import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Briefcase,
  CalendarClock,
  Lock,
  Plus,
  Rocket,
  ShieldCheck,
  Trash2,
  Users
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const DEFAULT_COMPANY_PHOTO = '/job-icon.jpg'

const emptyForm = {
  companyPhoto: '',
  companyName: '',
  jobRole: '',
  applyUrl: '',
  batchOrEducation: '',
  experience: '',
  jobDescription: '',
  endDate: ''
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export default function AdminJobsSecret() {
  const { user } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [photoName, setPhotoName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)

  const activeJobs = useMemo(() => jobs.filter(job => job.isActive).length, [jobs])

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/jobs/admin/all')
      setJobs(data.jobs || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load admin jobs data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 3200)
    fetchJobs()
    return () => clearTimeout(timer)
  }, [])

  const postJob = async e => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await api.post('/jobs/admin', form)
      setSuccess('New job posted successfully')
      setForm(emptyForm)
      setPhotoName('')
      fetchJobs()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post job')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePhotoUpload = e => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file only')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setForm(f => ({ ...f, companyPhoto: String(reader.result || '') }))
      setPhotoName(file.name)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const deleteJob = async id => {
    const confirmed = window.confirm('Are you sure you want to permanently delete this job?')
    if (!confirmed) return

    setError('')
    try {
      await api.delete(`/jobs/admin/${id}`)
      setJobs(prev => prev.filter(job => job._id !== id))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete job')
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
        <div className="glass-card p-8 text-center max-w-md w-full border border-red-400/30">
          <Lock className="w-8 h-8 text-red-300 mx-auto mb-3" />
          <h2 className="text-2xl text-white font-bold">Access Denied</h2>
          <p className="text-sm text-slate-400 mt-2">This page is protected. Only admins can access this secret URL.</p>
          <Link to="/dashboard" className="btn-secondary mt-5">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[520px] h-[520px] bg-red-500/10 rounded-full blur-[130px]" />
          <div className="absolute bottom-[-20%] left-[-5%] w-[620px] h-[620px] bg-amber-500/10 rounded-full blur-[140px]" />
        </div>
        <div className="relative z-10 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }} className="mb-6">
            <img src="/admin-logo.png" alt="Admin Loading" className="w-32 h-32 mx-auto rounded-xl object-contain" />
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }} className="mt-4">
            <p className="text-white text-lg font-bold mb-2">Initializing Admin Panel</p>
            <div className="flex items-center justify-center gap-1">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-0 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[520px] h-[520px] bg-red-500/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-20%] left-[-5%] w-[620px] h-[620px] bg-amber-500/10 rounded-full blur-[140px]" />
      </div>

      <header className="relative z-10 border-b border-white/[0.08] glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src="/admin-logo.png" alt="Admin Logo" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-contain flex-shrink-0 animate-fade-in" />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-red-300 whitespace-nowrap">Secret Admin Portal</p>
              <h1 className="text-sm sm:text-xl font-black text-white leading-tight whitespace-nowrap">Jobs Control Room</h1>
            </div>
          </div>
          <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 !rounded-lg !text-[11px] sm:!text-xs !px-2.5 sm:!px-4 !py-1.5 sm:!py-2 whitespace-nowrap flex-shrink-0 font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 transition-all duration-200 shadow-[0_8px_20px_rgba(249,115,22,0.35)] hover:shadow-[0_12px_26px_rgba(251,146,60,0.45)] active:scale-95">
            Go to Dashboard
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-5 py-6 sm:py-8 grid lg:grid-cols-[420px,1fr] gap-4 sm:gap-6">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-6 h-fit transition-all duration-300 hover:border-brand-400/30 hover:shadow-[0_0_34px_rgba(139,92,246,0.22)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Post New Job</h2>
            <span className="text-[11px] sm:text-xs text-red-200 bg-red-500/10 border border-red-400/20 rounded-full px-2 py-1 whitespace-nowrap">Hidden Panel</span>
          </div>

          <form onSubmit={postJob} className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Company Photo Upload</label>
              <input type="file" accept="image/*" className="input-field text-xs sm:text-sm file:mr-2 sm:file:mr-3 file:border-0 file:bg-white/10 file:text-white file:px-2 sm:file:px-3 file:py-1.5" onChange={handlePhotoUpload} />
              {!photoName && <p className="text-[11px] text-slate-500 mt-1">Optional: If not uploaded, default company icon will be used.</p>}
              {photoName && <p className="text-[11px] text-slate-400 mt-1">Uploaded: {photoName}</p>}
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Company Name</label>
              <input className="input-field" placeholder="Enter company name" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Job Role</label>
              <input className="input-field" placeholder="Enter job role" value={form.jobRole} onChange={e => setForm(f => ({ ...f, jobRole: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Apply Redirect URL</label>
              <input className="input-field" placeholder="https://company.com/careers/apply" value={form.applyUrl} onChange={e => setForm(f => ({ ...f, applyUrl: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Batch / Education</label>
              <input className="input-field" placeholder="ex: BE/BTech 2024-2026" value={form.batchOrEducation} onChange={e => setForm(f => ({ ...f, batchOrEducation: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Experience</label>
              <input className="input-field" placeholder="ex: 0-2 years" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Job Description</label>
              <textarea className="input-field min-h-[120px]" placeholder="Enter full job description" value={form.jobDescription} onChange={e => setForm(f => ({ ...f, jobDescription: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Application End Date</label>
              <input type="date" className="input-field" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
            </div>

            {error && <p className="text-sm text-red-300">{error}</p>}
            {success && <p className="text-sm text-emerald-300">{success}</p>}

            <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 transition-all duration-200 shadow-[0_8px_20px_rgba(249,115,22,0.35)] hover:shadow-[0_12px_26px_rgba(251,146,60,0.45)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_8px_20px_rgba(249,115,22,0.35)]">
              <Plus className="w-4 h-4" /> {submitting ? 'Posting...' : 'Post Job'}
            </button>
          </form>
        </motion.section>

        <section>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="glass-card p-4 transition-all duration-300 hover:border-brand-400/30 hover:shadow-[0_0_28px_rgba(139,92,246,0.2)]">
              <p className="text-xs text-slate-500 uppercase">Total Jobs</p>
              <p className="text-2xl font-black text-white mt-1">{jobs.length}</p>
            </div>
            <div className="glass-card p-4 transition-all duration-300 hover:border-brand-400/30 hover:shadow-[0_0_28px_rgba(139,92,246,0.2)]">
              <p className="text-xs text-slate-500 uppercase">Active Jobs</p>
              <p className="text-2xl font-black text-emerald-300 mt-1">{activeJobs}</p>
            </div>
            <div className="glass-card p-4 transition-all duration-300 hover:border-brand-400/30 hover:shadow-[0_0_28px_rgba(139,92,246,0.2)]">
              <p className="text-xs text-slate-500 uppercase">Portal Status</p>
              <p className="text-sm font-bold text-amber-300 mt-1 inline-flex items-center gap-1"><Rocket className="w-4 h-4" /> Secure</p>
            </div>
          </div>

          {loading ? (
            <div className="glass-card p-8 text-center text-slate-400 transition-all duration-300 hover:border-brand-400/30 hover:shadow-[0_0_34px_rgba(139,92,246,0.2)]">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="glass-card p-8 text-center transition-all duration-300 hover:border-brand-400/30 hover:shadow-[0_0_34px_rgba(139,92,246,0.2)]">
              <Briefcase className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <h3 className="text-white text-lg font-semibold">No jobs posted yet</h3>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map(job => (
                <div key={job._id} className="glass-card p-4 border border-white/[0.09] transition-all duration-300 hover:border-brand-400/40 hover:shadow-[0_0_36px_rgba(139,92,246,0.22)]">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-white p-1 ring-1 ring-white/10 grid place-items-center">
                        <img
                          src={job.companyPhoto || DEFAULT_COMPANY_PHOTO}
                          alt={job.companyName}
                          className="w-full h-full rounded object-contain"
                          onError={e => {
                            e.currentTarget.src = DEFAULT_COMPANY_PHOTO
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold break-words [overflow-wrap:anywhere]">Job Role: {job.jobRole}</h3>
                        <p className="text-xs text-slate-400 break-words [overflow-wrap:anywhere]">Company: {job.companyName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid sm:grid-cols-3 gap-2 text-xs text-slate-400">
                    <p className="glass rounded px-2 py-1 border border-white/[0.07] transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_22px_rgba(139,92,246,0.16)]">Batch/Education: {job.batchOrEducation}</p>
                    <p className="glass rounded px-2 py-1 border border-white/[0.07] transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_22px_rgba(139,92,246,0.16)]">Experience: {job.experience}</p>
                    <p className="glass rounded px-2 py-1 border border-white/[0.07] inline-flex items-center gap-1 transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_22px_rgba(139,92,246,0.16)]">
                      <CalendarClock className="w-3.5 h-3.5" /> End Date: {formatDate(job.endDate)}
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-slate-400 break-words [overflow-wrap:anywhere]">Job Description: {job.jobDescription}</p>

                  <p className="mt-2 text-[11px] text-slate-400 break-all">Apply Redirect URL: {job.applyUrl || 'Not set'}</p>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-300 inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-cyan-300" /> Applicants: {job.applicants?.length || 0}
                    </div>
                    <button
                      onClick={() => deleteJob(job._id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-400/30 bg-red-500/10 text-red-300 whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
