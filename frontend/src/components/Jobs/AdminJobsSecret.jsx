import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Briefcase,
  CalendarClock,
  Eye,
  Lock,
  Pencil,
  Plus,
  Rocket,
  Trash2,
  Users,
  X
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
  if (!date) return 'Not set'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return 'Not set'

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatPreviewEndDate(date) {
  if (!date) return 'No deadline'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return 'No deadline'

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function getDaysLeft(endDate) {
  if (!endDate) return null
  const now = new Date()
  const end = new Date(endDate)
  if (Number.isNaN(end.getTime())) return null
  const diffMs = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

function toDateInputValue(date) {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function truncateText(text, maxLength = 170) {
  if (!text) return 'Not provided'
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

export default function AdminJobsSecret() {
  const { user } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [editingJobId, setEditingJobId] = useState('')
  const [previewJob, setPreviewJob] = useState(null)
  const fileInputRef = useRef(null)

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

  useEffect(() => {
    if (previewJob) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [previewJob])

  const resetForm = () => {
    setForm(emptyForm)
    setPhotoUrl('')
    setPhotoName('')
    setEditingJobId('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const postJob = async e => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    if (!form.companyName.trim()) {
      setError('Company Name is required')
      setSubmitting(false)
      return
    }

    if (!form.jobDescription.trim()) {
      setError('Job Description is required')
      setSubmitting(false)
      return
    }

    try {
      if (editingJobId) {
        await api.patch(`/jobs/admin/${editingJobId}`, form)
        setSuccess('Job updated successfully')
      } else {
        await api.post('/jobs/admin', form)
        setSuccess('New job posted successfully')
      }
      resetForm()
      fetchJobs()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save job')
    } finally {
      setSubmitting(false)
    }
  }

  const readFileAsDataUrl = file => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Unable to read image file'))
    reader.readAsDataURL(file)
  })

  const setCompanyPhotoFromImageFile = async (file, sourceName) => {
    if (!file.type.startsWith('image/')) {
      setError('Please use a valid image file')
      return
    }

    try {
      const imageDataUrl = await readFileAsDataUrl(file)
      setForm(f => ({ ...f, companyPhoto: imageDataUrl }))
      setPhotoUrl('')
      setPhotoName(sourceName || file.name || 'Image selected')
      setError('')
    } catch {
      setError('Unable to process image file')
    }
  }

  const handlePhotoUpload = async e => {
    const file = e.target.files?.[0]
    if (!file) return

    await setCompanyPhotoFromImageFile(file, file.name)
  }

  const handlePhotoUrlApply = () => {
    const trimmedUrl = photoUrl.trim()
    if (!trimmedUrl) {
      setForm(f => ({ ...f, companyPhoto: '' }))
      setPhotoName('')
      setError('')
      return
    }

    try {
      const normalized = new URL(trimmedUrl).toString()
      setForm(f => ({ ...f, companyPhoto: normalized }))
      setPhotoName('Image URL')
      setError('')
    } catch {
      setError('Please enter a valid image URL')
    }
  }

  const handlePhotoPaste = async e => {
    const clipboardItems = Array.from(e.clipboardData?.items || [])
    const imageItem = clipboardItems.find(item => item.type.startsWith('image/'))
    if (!imageItem) return

    e.preventDefault()
    const file = imageItem.getAsFile()
    if (!file) {
      setError('Unable to read pasted image')
      return
    }

    await setCompanyPhotoFromImageFile(file, 'Pasted image')
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

  const startEditJob = job => {
    setEditingJobId(job._id)
    setForm({
      companyPhoto: job.companyPhoto || '',
      companyName: job.companyName || '',
      jobRole: job.jobRole || '',
      applyUrl: job.applyUrl || '',
      batchOrEducation: job.batchOrEducation || '',
      experience: job.experience || '',
      jobDescription: job.jobDescription || '',
      endDate: toDateInputValue(job.endDate)
    })
    setPhotoUrl(job.companyPhoto && !job.companyPhoto.startsWith('data:') ? job.companyPhoto : '')
    setPhotoName(job.companyPhoto ? 'Existing image' : '')
    if (fileInputRef.current) fileInputRef.current.value = ''
    setError('')
    setSuccess('Edit mode enabled. Update fields and click Save Changes.')
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
            <h2 className="text-lg font-bold text-white">{editingJobId ? 'Edit Job' : 'Post New Job'}</h2>
            <span className="text-[11px] sm:text-xs text-red-200 bg-red-500/10 border border-red-400/20 rounded-full px-2 py-1 whitespace-nowrap">Hidden Panel</span>
          </div>

          <form onSubmit={postJob} className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Company Photo (Optional)</label>
              <input ref={fileInputRef} type="file" accept="image/*" className="input-field text-xs sm:text-sm file:mr-2 sm:file:mr-3 file:border-0 file:bg-white/10 file:text-white file:px-2 sm:file:px-3 file:py-1.5" onChange={handlePhotoUpload} />

              <div className="mt-2 flex gap-2">
                <input
                  className="input-field"
                  placeholder="Paste image URL"
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handlePhotoUrlApply}
                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-brand-400/30 bg-brand-500/10 text-brand-200 whitespace-nowrap"
                >
                  Use URL
                </button>
              </div>

              <div
                onPaste={handlePhotoPaste}
                className="mt-2 rounded-lg border border-dashed border-white/20 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400"
              >
                Copy image and paste here with Ctrl+V
              </div>

              {!photoName && <p className="text-[11px] text-slate-500 mt-1">If no image is provided, default company icon will be used.</p>}
              {photoName && <p className="text-[11px] text-slate-400 mt-1">Selected source: {photoName}</p>}

              {form.companyPhoto && (
                <div className="mt-2 w-16 h-16 rounded-lg bg-white p-1 ring-1 ring-white/10">
                  <img
                    src={form.companyPhoto}
                    alt="Selected company"
                    className="w-full h-full rounded object-contain"
                    onError={e => {
                      e.currentTarget.src = DEFAULT_COMPANY_PHOTO
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Company Name *</label>
              <input className="input-field" placeholder="Enter company name" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Job Role</label>
              <input className="input-field" placeholder="Enter job role" value={form.jobRole} onChange={e => setForm(f => ({ ...f, jobRole: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Apply Redirect URL</label>
              <input className="input-field" placeholder="https://company.com/careers/apply" value={form.applyUrl} onChange={e => setForm(f => ({ ...f, applyUrl: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Batch / Education</label>
              <input className="input-field" placeholder="ex: BE/BTech 2024-2026" value={form.batchOrEducation} onChange={e => setForm(f => ({ ...f, batchOrEducation: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Experience</label>
              <input className="input-field" placeholder="ex: 0-2 years" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Job Description *</label>
              <textarea className="input-field min-h-[120px]" placeholder="Enter full job description" value={form.jobDescription} onChange={e => setForm(f => ({ ...f, jobDescription: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Application End Date</label>
              <input type="date" className="input-field" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>

            {error && <p className="text-sm text-red-300">{error}</p>}
            {success && <p className="text-sm text-emerald-300">{success}</p>}

            <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 transition-all duration-200 shadow-[0_8px_20px_rgba(249,115,22,0.35)] hover:shadow-[0_12px_26px_rgba(251,146,60,0.45)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_8px_20px_rgba(249,115,22,0.35)]">
              <Plus className="w-4 h-4" /> {submitting ? 'Saving...' : (editingJobId ? 'Save Changes' : 'Post Job')}
            </button>

            {editingJobId && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white text-sm border border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-200"
              >
                Cancel Edit
              </button>
            )}
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
                          alt={job.companyName || 'Company'}
                          className="w-full h-full rounded object-contain"
                          onError={e => {
                            e.currentTarget.src = DEFAULT_COMPANY_PHOTO
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold break-words [overflow-wrap:anywhere]">Job Role: {job.jobRole || 'Not provided'}</h3>
                        <p className="text-xs text-slate-400 break-words [overflow-wrap:anywhere]">Company: {job.companyName || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid sm:grid-cols-3 gap-2 text-xs text-slate-400">
                    <p className="glass rounded px-2 py-1 border border-white/[0.07] transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_22px_rgba(139,92,246,0.16)]">Batch/Education: {job.batchOrEducation || 'Not set'}</p>
                    <p className="glass rounded px-2 py-1 border border-white/[0.07] transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_22px_rgba(139,92,246,0.16)]">Experience: {job.experience || 'Not set'}</p>
                    <p className="glass rounded px-2 py-1 border border-white/[0.07] inline-flex items-center gap-1 transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_22px_rgba(139,92,246,0.16)]">
                      <CalendarClock className="w-3.5 h-3.5" /> End Date: {formatDate(job.endDate)}
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-slate-400 break-words [overflow-wrap:anywhere]">Job Description: {truncateText(job.jobDescription)}</p>

                  <p className="mt-2 text-[11px] text-slate-400 break-all">Apply Redirect URL: {job.applyUrl || 'Not set'}</p>

                  <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs text-slate-300 inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-cyan-300" /> Applicants: {job.applicants?.length || 0}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewJob(job)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-cyan-400/30 bg-cyan-500/10 text-cyan-200 whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button
                        onClick={() => startEditJob(job)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-400/30 bg-amber-500/10 text-amber-200 whitespace-nowrap"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => deleteJob(job._id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-400/30 bg-red-500/10 text-red-300 whitespace-nowrap"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {previewJob && (
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
                    src={previewJob.companyPhoto || DEFAULT_COMPANY_PHOTO}
                    alt={previewJob.companyName || 'Company'}
                    className="w-full h-full rounded object-contain"
                    onError={e => {
                      e.currentTarget.src = DEFAULT_COMPANY_PHOTO
                    }}
                  />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white break-words [overflow-wrap:anywhere]">{previewJob.jobRole || 'Not provided'}</h2>
                  <p className="text-sm text-slate-400 mt-1">{previewJob.companyName || 'Not provided'}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewJob(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="glass rounded-lg p-4 border border-white/[0.08] transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_24px_rgba(139,92,246,0.2)]">
                  <p className="text-xs text-slate-500 uppercase">Batch / Education: <span className="text-white font-semibold">{previewJob.batchOrEducation || 'Not set'}</span></p>
                </div>
                <div className="glass rounded-lg p-4 border border-white/[0.08] transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_24px_rgba(139,92,246,0.2)]">
                  <p className="text-xs text-slate-500 uppercase">Experience: <span className="text-white font-semibold">{previewJob.experience || 'Not set'}</span></p>
                </div>
                <div className="glass rounded-lg p-4 border border-white/[0.08] transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_24px_rgba(139,92,246,0.2)]">
                  <p className="text-xs text-slate-500 uppercase">Deadline: <span className="text-white font-semibold">{formatPreviewEndDate(previewJob.endDate)}</span></p>
                </div>
                <div className="glass rounded-lg p-4 border border-white/[0.08] transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_24px_rgba(139,92,246,0.2)]">
                  <p className="text-xs text-slate-500 uppercase">Days Left: <span className="text-white font-semibold">{getDaysLeft(previewJob.endDate) === null ? 'N/A' : `${getDaysLeft(previewJob.endDate)} days`}</span></p>
                </div>
              </div>

              <div className="glass rounded-lg p-4 border border-white/[0.08] transition-all duration-300 hover:border-brand-400/35 hover:shadow-[0_0_28px_rgba(139,92,246,0.22)]">
                <p className="text-xs text-slate-500 uppercase mb-2">Complete Job Description</p>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{previewJob.jobDescription || 'Not provided'}</p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setPreviewJob(null)}
                  className="flex-1 btn-secondary"
                >
                  Close
                </button>
                <button
                  type="button"
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
