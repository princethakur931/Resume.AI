import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { authWithFirebase } from '../../services/api'
import {
  getFirebaseIdToken,
  sendVerificationEmailToUser,
  signInWithGooglePopup,
  signOutFirebase,
  signUpWithEmailPassword,
  updateFirebaseProfileName
} from '../../services/firebase'

function GoogleColorIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
      <path fill="#FFC107" d="M43.61 20.08H42V20H24v8h11.3C33.66 32.66 29.27 36 24 36c-6.62 0-12-5.38-12-12s5.38-12 12-12c3.06 0 5.84 1.15 7.95 3.05l5.66-5.66C34.06 6.05 29.27 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.39-3.92z" />
      <path fill="#FF3D00" d="M6.31 14.69l6.57 4.82C14.66 15.11 18.96 12 24 12c3.06 0 5.84 1.15 7.95 3.05l5.66-5.66C34.06 6.05 29.27 4 24 4c-7.68 0-14.32 4.34-17.69 10.69z" />
      <path fill="#4CAF50" d="M24 44c5.17 0 9.86-1.98 13.41-5.2l-6.19-5.24C29.18 35.09 26.72 36 24 36c-5.25 0-9.62-3.31-11.29-7.94l-6.52 5.02C9.51 39.56 16.24 44 24 44z" />
      <path fill="#1976D2" d="M43.61 20.08H42V20H24v8h11.3a12.04 12.04 0 0 1-4.08 5.56l.01-.01 6.19 5.24C36.97 39.14 44 34 44 24c0-1.34-.14-2.65-.39-3.92z" />
    </svg>
  )
}

const passwordChecks = [
  { label: 'At least 6 characters', test: v => v.length >= 6 },
  { label: 'Contains a number', test: v => /\d/.test(v) },
]

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const { login } = useAuth()

  const continueWithFirebaseUser = async (firebaseUser, nameHint = '') => {
    const idToken = await getFirebaseIdToken(firebaseUser)
    const photoFromProvider = firebaseUser?.photoURL || firebaseUser?.providerData?.[0]?.photoURL || ''
    const { data } = await authWithFirebase({
      idToken,
      name: nameHint || form.name,
      profilePhoto: photoFromProvider
    })
    login(data.token, {
      ...data.user,
      profilePhoto: data.user?.profilePhoto || photoFromProvider || ''
    })
    window.location.href = '/dashboard'
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setStatusMessage('')
    setLoading(true)
    try {
      const result = await signUpWithEmailPassword(form.email, form.password)
      if (form.name.trim()) {
        await updateFirebaseProfileName(result.user, form.name.trim())
      }
      await sendVerificationEmailToUser(result.user)
      await signOutFirebase()
      setStatusMessage('A verification link has been sent to your email. Please verify your account, then sign in.')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      setError('')
      setStatusMessage('')
      setSocialLoading(true)
      const result = await signInWithGooglePopup()
      await continueWithFirebaseUser(result.user, result.user.displayName || form.name)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Google signup failed')
    } finally {
      setSocialLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[5%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[5%] w-[400px] h-[400px] bg-brand-600/8 rounded-full blur-[90px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-glow-sm ring-1 ring-white/10">
              <img src="/Resume.AI.jpeg" alt="Resume.AI logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold text-white">Resume<span className="gradient-text">.AI</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">Start optimizing your resume with AI - free</p>
        </div>

        <div className="glass-card p-8">
          {statusMessage && (
            <motion.div
              className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm mb-5"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {statusMessage}
            </motion.div>
          )}

          {error && (
            <motion.div
              className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input-field pl-10 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 space-y-1">
                  {passwordChecks.map(({ label, test }) => (
                    <div key={label} className={`flex items-center gap-1.5 text-xs transition-colors ${test(form.password) ? 'text-emerald-400' : 'text-slate-600'}`}>
                      <CheckCircle2 className="w-3 h-3" />
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</>
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-slate-500">OR</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={socialLoading}
            className="btn-secondary w-full py-3"
          >
            {socialLoading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting...</>
            ) : (
              <><GoogleColorIcon /> Continue with Google</>
            )}
          </button>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
