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
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

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

  const [isEditing, setIsEditing] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    name: user?.name || '',
    profilePhoto: user?.profilePhoto || '',
    githubProfile: user?.githubProfile || '',
    linkedinProfile: user?.linkedinProfile || ''
  })

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name || '',
      profilePhoto: user.profilePhoto || '',
      githubProfile: user.githubProfile || '',
      linkedinProfile: user.linkedinProfile || ''
    })
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleCancelEdit = () => {
    setError('')
    setSuccess('')
    setIsEditing(false)
    setForm({
      name: user?.name || '',
      profilePhoto: user?.profilePhoto || '',
      githubProfile: user?.githubProfile || '',
      linkedinProfile: user?.linkedinProfile || ''
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
        githubProfile: buildPublicLink(form.githubProfile, 'github'),
        linkedinProfile: buildPublicLink(form.linkedinProfile, 'linkedin')
      }

      const { data } = await api.put('/auth/profile', payload)
      updateUser(data.user)
      setSuccess('Profile updated successfully')
      setIsEditing(false)
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
    <div className="min-h-screen bg-surface-0 relative overflow-x-hidden">
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
            className="btn-secondary px-4 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <button onClick={handleLogout} className="btn-secondary px-4 py-2">Logout</button>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <section className="glass-card p-6 lg:col-span-1">
            <div className="flex flex-col items-center text-center">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center ring-1 ring-white/15 shadow-glow-sm">
                {form.profilePhoto ? (
                  <img src={form.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">{(form.name || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>

              <h1 className="mt-4 text-xl font-semibold text-white">{form.name || 'Unnamed User'}</h1>
              <p className="text-sm text-slate-400">{user?.email || '-'}</p>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <p className="text-slate-500 text-xs mb-1 flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5" />
                  GitHub
                </p>
                {form.githubProfile ? (
                  <a
                    href={buildPublicLink(form.githubProfile, 'github')}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-300 break-all hover:text-brand-200"
                  >
                    {buildPublicLink(form.githubProfile, 'github')}
                  </a>
                ) : (
                  <p className="text-slate-500">Not added</p>
                )}
              </div>

              <div className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <p className="text-slate-500 text-xs mb-1 flex items-center gap-1.5">
                  <Linkedin className="w-3.5 h-3.5" />
                  LinkedIn
                </p>
                {form.linkedinProfile ? (
                  <a
                    href={buildPublicLink(form.linkedinProfile, 'linkedin')}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-300 break-all hover:text-brand-200"
                  >
                    {buildPublicLink(form.linkedinProfile, 'linkedin')}
                  </a>
                ) : (
                  <p className="text-slate-500">Not added</p>
                )}
              </div>
            </div>
          </section>

          <section className="glass-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white">Profile Settings</h2>
                <p className="text-sm text-slate-500 mt-1">View and manage your account details.</p>
              </div>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="btn-primary px-4 py-2">
                  <PencilLine className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <button onClick={handleCancelEdit} className="btn-secondary px-4 py-2">
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              )}
            </div>

            {error && (
              <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {success}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {isEditing && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Profile Photo</label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <label className={`btn-secondary px-4 py-2 cursor-pointer ${(saving || photoUploading) ? 'opacity-50 pointer-events-none' : ''}`}>
                      {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {photoUploading ? 'Uploading...' : 'Upload Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={saving || photoUploading}
                      />
                    </label>
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> JPG, PNG, WEBP up to 5MB
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your username"
                    className="input-field pl-10"
                    disabled={!isEditing || saving}
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

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">GitHub Profile</label>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    value={form.githubProfile}
                    onChange={e => setForm(prev => ({ ...prev, githubProfile: e.target.value }))}
                    placeholder="https://github.com/username"
                    className="input-field pl-10"
                    disabled={!isEditing || saving}
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
                    disabled={!isEditing || saving}
                  />
                </div>
              </div>

              {isEditing && (
                <div className="pt-1">
                  <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto px-5 py-2.5">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
                  </button>
                </div>
              )}
            </form>
          </section>
        </motion.div>
      </main>
    </div>
  )
}
