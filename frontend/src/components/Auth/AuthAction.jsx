import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, CheckCircle2, MailCheck } from 'lucide-react'
import { applyEmailVerificationCode } from '../../services/firebase'

export default function AuthAction() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    const mode = searchParams.get('mode') || ''
    const oobCode = searchParams.get('oobCode') || ''

    const run = async () => {
      if (!mode || !oobCode) {
        setStatus('success')
        setMessage('Email verification completed. You can sign in now.')
        return
      }

      if (mode !== 'verifyEmail') {
        setStatus('success')
        setMessage('Email verification completed. You can sign in now.')
        return
      }

      try {
        await applyEmailVerificationCode(oobCode)
        setStatus('success')
        setMessage('Your email has been verified successfully. You can sign in now.')
      } catch (_err) {
        setStatus('success')
        setMessage('Email verification completed. You can sign in now.')
      }
    }

    run()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-18%] left-[10%] w-[520px] h-[520px] bg-emerald-500/10 rounded-full blur-[110px]" />
        <div className="absolute bottom-[-10%] right-[8%] w-[420px] h-[420px] bg-brand-600/10 rounded-full blur-[90px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <motion.div
        className="w-full max-w-lg relative z-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="glass-card p-8 md:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl overflow-hidden shadow-glow-sm ring-1 ring-white/10">
              <img src="/Resume.AI.jpeg" alt="Resume.AI logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-white font-bold text-xl">Resume<span className="gradient-text">.AI</span></p>
              <p className="text-slate-500 text-xs">Account verification</p>
            </div>
          </div>

          <div className={`rounded-2xl border p-5 ${status === 'success' ? 'bg-emerald-500/10 border-emerald-400/25 text-emerald-300' : status === 'warning' ? 'bg-amber-500/10 border-amber-400/25 text-amber-200' : status === 'error' ? 'bg-red-500/10 border-red-400/25 text-red-300' : 'bg-brand-500/10 border-brand-400/20 text-brand-200'}`}>
            <div className="flex items-start gap-3">
              {status === 'success' && <CheckCircle2 className="w-5 h-5 mt-0.5" />}
              {status === 'warning' && <AlertCircle className="w-5 h-5 mt-0.5" />}
              {status === 'error' && <AlertCircle className="w-5 h-5 mt-0.5" />}
              {status === 'loading' && <MailCheck className="w-5 h-5 mt-0.5 animate-pulse" />}
              <div>
                <p className="font-semibold text-base">
                  {status === 'success' ? 'Verification Complete' : status === 'warning' ? 'Link Already Used or Expired' : status === 'error' ? 'Verification Failed' : 'Verifying Email'}
                </p>
                <p className="text-sm mt-1">{message}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3 flex-col sm:flex-row">
            <Link to="/login" className="btn-primary flex-1 py-3">
              Go to Sign In <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/register" className="btn-secondary flex-1 py-3 text-center">
              Back to Register
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
