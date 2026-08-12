import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Camera,
  Upload,
  User,
  Mail,
  Github,
  Linkedin,
  PencilLine,
  Save,
  X,
  Loader2,
  GraduationCap,
  Building2,
  Calendar,
  BookOpen,
  Phone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import ProfileDropdown from '../Shared/ProfileDropdown'

const buildPublicLink = (value, type) => {
  if (!value.trim()) return ''
  const raw = value.trim()

  if (/^https?:\/\//i.test(raw)) return raw

  if (type === 'github') {
    const username = raw.replace(/^@/, '').replace(/^github\.com\//i, '')
    return `https://github.com/${username}`
  }

  if (type === 'linkedin') {
    const path = raw
      .replace(/^@/, '')
      .replace(/^linkedin\.com\//i, '')
      .replace(/^in\//i, 'in/')
    return `https://linkedin.com/${path}`
  }

  return raw
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingAbout, setIsEditingAbout] = useState(false)
  const [isEditingEducation, setIsEditingEducation] = useState(false)
  const [isEditingConnect, setIsEditingConnect] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [avatarLoadError, setAvatarLoadError] = useState(false)
  const [form, setForm] = useState({
    name: user?.name || '',
    profilePhoto: user?.profilePhoto || '',
    title: user?.title || '',
    githubProfile: user?.githubProfile || '',
    linkedinProfile: user?.linkedinProfile || '',
    phoneNumber: user?.phoneNumber || '',
    about: user?.about || '',
    education: user?.education || {
      collegeName: '',
      degree: '',
      course: '',
      startYear: '',
      endYear: ''
    }
  })

  const normalizedPhoto = typeof form.profilePhoto === 'string' ? form.profilePhoto.trim() : ''
  const shouldShowAvatar = Boolean(normalizedPhoto) && !avatarLoadError

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name || '',
      profilePhoto: user.profilePhoto || '',
      title: user.title || '',
      githubProfile: user.githubProfile || '',
      linkedinProfile: user.linkedinProfile || '',
      phoneNumber: user.phoneNumber || '',
      about: user.about || '',
      education: user.education || {
        collegeName: '',
        degree: '',
        course: '',
        startYear: '',
        endYear: ''
      }
    })
  }, [user])

  useEffect(() => {
    setAvatarLoadError(false)
  }, [normalizedPhoto])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleCancelEdit = () => {
    setError('')
    setSuccess('')
    setIsEditingAbout(false)
    setIsEditingProfile(false)
    setIsEditingEducation(false)
    setIsEditingConnect(false)
    setForm({
      name: user?.name || '',
      profilePhoto: user?.profilePhoto || '',
      title: user?.title || '',
      githubProfile: user?.githubProfile || '',
      linkedinProfile: user?.linkedinProfile || '',
      phoneNumber: user?.phoneNumber || '',
      about: user?.about || '',
      education: user?.education || {
        collegeName: '',
        degree: '',
        course: '',
        startYear: '',
        endYear: ''
      }
    })
  }

  const handleSave = async e => {
    e.preventDefault()

    if (!form.name.trim() || form.name.trim().length < 2) {
      setError('Username must be at least 2 characters')
      return
    }

    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const payload = {
        name: form.name.trim(),
        title: form.title.trim(),
        githubProfile: buildPublicLink(form.githubProfile, 'github'),
        linkedinProfile: buildPublicLink(form.linkedinProfile, 'linkedin'),
        phoneNumber: form.phoneNumber.trim(),
        about: form.about.trim(),
        education: form.education
      }

      const { data } = await api.put('/auth/profile', payload)
      updateUser(data.user)
      setSuccess('Profile updated successfully')
      setIsEditingAbout(false)
      setIsEditingProfile(false)
      setIsEditingEducation(false)
      setIsEditingConnect(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async e => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      e.target.value = ''
      return
    }

    setError('')
    setSuccess('')
    setPhotoUploading(true)

    try {
      const formData = new FormData()
      formData.append('photo', file)

      const { data } = await api.post('/auth/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      updateUser(data.user)
      setForm(prev => ({ ...prev, profilePhoto: data.user.profilePhoto || '' }))
      setSuccess('Profile photo uploaded successfully')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not upload profile photo')
    } finally {
      setPhotoUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 relative overflow-x-hidden pb-[70px] md:pb-0">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[430px] h-[320px] bg-brand-600/6 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[340px] h-[300px] bg-violet-600/5 rounded-full blur-[90px]" />
      </div>

      <header className="relative z-20 flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] glass">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Go to home page">
            <div className="w-7 h-7 rounded-lg overflow-hidden shadow-glow-sm ring-1 ring-white/10">
              <img src="/Resume.AI.jpeg" alt="Resume.AI logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-base font-bold text-white">Resume<span className="gradient-text">.AI</span></span>
          </Link>
          <button
            onClick={() => navigate('/dashboard')}
            className="hidden md:flex btn-secondary px-4 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <ProfileDropdown />
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <section className="glass-card p-6 lg:col-span-1 relative">
            {!isEditingProfile ? (
              <button 
                onClick={() => setIsEditingProfile(true)} 
                className="absolute top-4 right-4 text-brand-400 hover:text-brand-300 transition-colors p-2 rounded-lg hover:bg-white/5"
              >
                <PencilLine className="w-4 h-4" />
              </button>
            ) : (
              <div className="absolute top-4 right-4 flex items-center gap-1">
                <button onClick={handleCancelEdit} className="text-slate-400 hover:text-white transition-colors p-2">
                  <X className="w-4 h-4" />
                </button>
                <button onClick={handleSave} disabled={saving} className="text-brand-400 hover:text-brand-300 transition-colors p-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
            )}

            <div className="flex flex-col items-center text-center mt-4">
              <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center ring-1 ring-white/15 shadow-glow-sm group">
                {shouldShowAvatar ? (
                  <img
                    src={normalizedPhoto}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarLoadError(true)}
                  />
                ) : (
                  <span className="text-3xl font-bold text-white">{(form.name || 'U').charAt(0).toUpperCase()}</span>
                )}
                
                {isEditingProfile && (
                  <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    {photoUploading ? <Loader2 className="w-6 h-6 animate-spin text-white mb-1" /> : <Camera className="w-6 h-6 text-white mb-1" />}
                    <span className="text-[10px] text-white font-medium">{photoUploading ? 'Uploading...' : 'Change Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={saving || photoUploading}
                    />
                  </label>
                )}
              </div>

              {isEditingProfile ? (
                <div className="mt-4 w-full flex flex-col gap-2">
                  <input
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your username"
                    className="input-field text-center font-semibold text-lg py-1.5 px-3 w-full"
                    disabled={saving}
                    required
                  />
                  <input
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Software Engineer"
                    className="input-field text-center text-sm py-1.5 px-3 w-full"
                    disabled={saving}
                  />
                </div>
              ) : (
                <>
                  <h1 className="mt-4 text-xl font-semibold text-white">{form.name || 'Unnamed User'}</h1>
                  {user?.title && (
                    <p className="text-sm font-medium text-brand-300 mt-1">{user.title}</p>
                  )}
                </>
              )}
            </div>
          </section>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <section className="glass-card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">About Me</h2>
              {!isEditingAbout ? (
                <button onClick={() => setIsEditingAbout(true)} className="text-brand-400 hover:text-brand-300 transition-colors p-2 rounded-lg hover:bg-white/5">
                  <PencilLine className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleCancelEdit} className="text-slate-400 hover:text-white transition-colors p-2">
                    <X className="w-4 h-4" />
                  </button>
                  <button onClick={handleSave} disabled={saving} className="btn-primary px-3 py-1.5 text-xs">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </button>
                </div>
              )}
            </div>
            
            {error && (
              <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {isEditingAbout ? (
              <div className="flex flex-col gap-1.5">
                <textarea
                  value={form.about || ''}
                  onChange={e => setForm(prev => ({ ...prev, about: e.target.value }))}
                  placeholder="Write something about yourself..."
                  className="input-field w-full min-h-[150px] resize-y"
                  maxLength={500}
                  autoFocus
                />
                <div className="flex justify-end pr-1">
                  <span className={`text-[11px] font-medium ${(form.about?.length || 0) >= 500 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {(form.about?.length || 0)}/500
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-slate-300 whitespace-pre-wrap flex-1">
                {user?.about ? (
                  user.about
                ) : (
                  <span className="text-slate-500 italic">No description added yet. Click the edit icon to add one!</span>
                )}
              </div>
            )}
            </section>

            <section className="glass-card p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Education</h2>
                {!isEditingEducation ? (
                  <button onClick={() => setIsEditingEducation(true)} className="text-brand-400 hover:text-brand-300 transition-colors p-2 rounded-lg hover:bg-white/5">
                    <PencilLine className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={handleCancelEdit} className="text-slate-400 hover:text-white transition-colors p-2">
                      <X className="w-4 h-4" />
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary px-3 py-1.5 text-xs">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>
                )}
              </div>

              {isEditingEducation ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1.5">College/University Name</label>
                    <input
                      value={form.education?.collegeName || ''}
                      onChange={e => setForm(prev => ({ ...prev, education: { ...prev.education, collegeName: e.target.value } }))}
                      placeholder="e.g. Stanford University"
                      className="input-field w-full"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Degree</label>
                    <input
                      value={form.education?.degree || ''}
                      onChange={e => setForm(prev => ({ ...prev, education: { ...prev.education, degree: e.target.value } }))}
                      placeholder="e.g. B.Tech"
                      className="input-field w-full"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Course/Major</label>
                    <input
                      value={form.education?.course || ''}
                      onChange={e => setForm(prev => ({ ...prev, education: { ...prev.education, course: e.target.value } }))}
                      placeholder="e.g. Computer Science"
                      className="input-field w-full"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Start Year</label>
                    <input
                      value={form.education?.startYear || ''}
                      onChange={e => setForm(prev => ({ ...prev, education: { ...prev.education, startYear: e.target.value } }))}
                      placeholder="e.g. 2020"
                      className="input-field w-full"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">End Year (or Expected)</label>
                    <input
                      value={form.education?.endYear || ''}
                      onChange={e => setForm(prev => ({ ...prev, education: { ...prev.education, endYear: e.target.value } }))}
                      placeholder="e.g. 2024"
                      className="input-field w-full"
                      disabled={saving}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  {user?.education && (user.education.collegeName || user.education.degree || user.education.course) ? (
                    <div className="flex flex-col gap-3">
                      {user.education.collegeName && (
                        <div className="flex items-start gap-2.5">
                          <Building2 className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-white font-medium">{user.education.collegeName}</p>
                          </div>
                        </div>
                      )}
                      
                      {(user.education.degree || user.education.course) && (
                        <div className="flex items-start gap-2.5">
                          <GraduationCap className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-slate-300">
                              {user.education.degree}{user.education.degree && user.education.course ? ' in ' : ''}{user.education.course}
                            </p>
                          </div>
                        </div>
                      )}

                      {(user.education.startYear || user.education.endYear) && (
                        <div className="flex items-start gap-2.5">
                          <Calendar className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-slate-400 text-sm">
                              {user.education.startYear || 'N/A'} - {user.education.endYear || 'Present'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">No education details added yet. Click the edit icon to add!</span>
                  )}
                </div>
              )}
            </section>

            <section className="glass-card p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Connect With Me</h2>
                {!isEditingConnect ? (
                  <button onClick={() => setIsEditingConnect(true)} className="text-brand-400 hover:text-brand-300 transition-colors p-2 rounded-lg hover:bg-white/5">
                    <PencilLine className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={handleCancelEdit} className="text-slate-400 hover:text-white transition-colors p-2">
                      <X className="w-4 h-4" />
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary px-3 py-1.5 text-xs">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>
                )}
              </div>

              {isEditingConnect ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Email Address (Registered)</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input value={user?.email || ''} className="input-field pl-10 opacity-70 cursor-not-allowed" disabled />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input
                        value={form.phoneNumber || ''}
                        onChange={e => setForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="e.g. +91 9876543210"
                        className="input-field pl-10"
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">GitHub Profile</label>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input
                        value={form.githubProfile}
                        onChange={e => setForm(prev => ({ ...prev, githubProfile: e.target.value }))}
                        placeholder="https://github.com/username"
                        className="input-field pl-10"
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">LinkedIn Profile</label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input
                        value={form.linkedinProfile}
                        onChange={e => setForm(prev => ({ ...prev, linkedinProfile: e.target.value }))}
                        placeholder="https://linkedin.com/in/username"
                        className="input-field pl-10"
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  {user?.email && (
                    <div className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-brand-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 mb-0.5">Email</p>
                        <a href={`mailto:${user.email}`} className="text-sm font-medium text-slate-200 truncate block hover:text-brand-300">
                          {user.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {user?.phoneNumber && (
                    <div className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 mb-0.5">Phone</p>
                        <a href={`tel:${user.phoneNumber}`} className="text-sm font-medium text-slate-200 truncate block hover:text-emerald-300">
                          {user.phoneNumber}
                        </a>
                      </div>
                    </div>
                  )}

                  {user?.githubProfile && (
                    <div className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center shrink-0">
                        <Github className="w-5 h-5 text-slate-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 mb-0.5">GitHub</p>
                        <a href={user.githubProfile} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-200 truncate block hover:text-white">
                          View Profile
                        </a>
                      </div>
                    </div>
                  )}

                  {user?.linkedinProfile && (
                    <div className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                        <Linkedin className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 mb-0.5">LinkedIn</p>
                        <a href={user.linkedinProfile} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-200 truncate block hover:text-cyan-300">
                          View Profile
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

        </motion.div>
      </main>
    </div>
  )
}
