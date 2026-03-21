import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Zap, Target, FileCheck, ChevronRight, Sparkles, Shield, BarChart3 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }
const stagger = { visible: { transition: { staggerChildren: 0.12 } } }

const features = [
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Instant LaTeX Conversion',
    desc: 'Upload any resume format — PDF, DOCX, or TXT. Our AI reverse-engineers your exact layout into precision LaTeX code in seconds.',
    color: 'from-yellow-400/20 to-orange-400/10',
    border: 'border-yellow-500/20',
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: 'ATS Keyword Intelligence',
    desc: "Paste the job description and watch our AI extract critical keywords, skills, and phrases that ATS systems scan for — then inject them perfectly.",
    color: 'from-brand-400/20 to-violet-400/10',
    border: 'border-brand-500/20',
  },
  {
    icon: <FileCheck className="w-5 h-5" />,
    title: '1-Page Perfection',
    desc: 'Every compiled resume is guaranteed to be exactly one page — the gold standard for recruiter attention and ATS parsing accuracy.',
    color: 'from-emerald-400/20 to-teal-400/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: 'Real ATS Score',
    desc: 'Get a quantified ATS compatibility score before you apply. Know exactly how well your resume matches the role.',
    color: 'from-pink-400/20 to-rose-400/10',
    border: 'border-pink-500/20',
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: 'Live PDF Preview',
    desc: 'See your professionally compiled resume instantly — no LaTeX knowledge needed. What you see is exactly what recruiters receive.',
    color: 'from-cyan-400/20 to-sky-400/10',
    border: 'border-cyan-500/20',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Private & Secure',
    desc: 'Your resume data is encrypted and linked only to your account. We never share, sell, or train on your personal information.',
    color: 'from-violet-400/20 to-purple-400/10',
    border: 'border-violet-500/20',
  },
]

const steps = [
  { num: '01', title: 'Upload Your Resume', desc: 'Drag & drop your existing resume in any format', color: 'text-brand-400' },
  { num: '02', title: 'Add Job Description', desc: 'Paste the target job posting you want to apply for', color: 'text-violet-400' },
  { num: '03', title: 'AI Optimization', desc: 'Claude AI extracts keywords and enhances your resume', color: 'text-emerald-400' },
  { num: '04', title: 'Download & Apply', desc: 'Get your ATS-optimized PDF resume instantly', color: 'text-pink-400' },
]

export default function Landing() {
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen bg-surface-0 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] bg-cyan-600/6 rounded-full blur-[90px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/[0.06] glass">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden shadow-glow-sm ring-1 ring-white/10">
            <img src="/Resume.AI.jpeg" alt="Resume.AI logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Resume<span className="gradient-text">.AI</span></span>
        </div>
        <div className="flex items-center gap-3">
          {!loading && user ? (
            <>
              <span className="hidden sm:inline text-xs text-slate-400">Signed in as {user?.name}</span>
              <Link to="/dashboard" className="btn-primary text-sm px-4 py-2">Go to Dashboard <ArrowRight className="w-4 h-4" /></Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm px-4 py-2">Sign In</Link>
              <Link to="/register" className="btn-primary text-sm px-4 py-2">Get Started <ArrowRight className="w-4 h-4" /></Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-28 pb-20 px-6 text-center">
        <motion.div
          className="max-w-5xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-6 flex justify-center">
            <div className="section-badge">
              <Sparkles className="w-3 h-3" />
              Powered by Resume.AI
            </div>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            <span className="text-white">Your Resume,</span>
            <br />
            <span className="gradient-text">Supercharged by AI</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your resume and a job description. Our AI converts it to perfect LaTeX, injects
            ATS-critical keywords into the right sections, compiles it to a flawless 1-page PDF — all
            in under 60 seconds.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!loading && user ? (
              <>
                <Link to="/dashboard" className="btn-primary px-8 py-4 text-base shadow-glow-md">
                  Continue to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <span className="text-sm text-slate-500">You are already signed in.</span>
              </>
            ) : (
              <>
                <Link to="/register" className="btn-primary w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base shadow-glow-md">
                  Optimize My Resume Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/login" className="btn-secondary w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base">
                  Sign In
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[['3x', 'More Interview Calls'], ['94%', 'ATS Pass Rate'], ['< 60s', 'Optimization Time'], ['1 Page', 'Always Guaranteed']].map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-black gradient-text mb-1">{num}</div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">{label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Mock UI Preview */}
      <section className="relative z-10 px-6 pb-24">
        <motion.div
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="glass-card p-1 relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-brand-500/20 via-violet-500/20 to-cyan-500/20 blur" />
            <div className="relative rounded-xl overflow-hidden bg-surface-1">
              {/* Mock browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-surface-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 mx-4 bg-white/[0.04] rounded px-3 py-1 text-xs text-slate-500 text-center font-mono">
                  resume.ai/dashboard
                </div>
              </div>
              {/* Mock dashboard UI */}
              <div className="grid grid-cols-2 gap-0 min-h-[320px]">
                {/* Left panel */}
                <div className="p-6 border-r border-white/[0.06]">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-4">Upload & Optimize</div>
                  <div className="space-y-3">
                    <div className="glass rounded-lg p-3 border border-brand-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-xs text-slate-400">resume_john_doe.pdf</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className="h-full w-3/4 progress-bar rounded-full" />
                      </div>
                    </div>
                    <div className="glass rounded-lg p-3 h-20 flex items-center justify-center text-xs text-slate-600 border border-dashed border-white/10">
                      Paste job description here...
                    </div>
                    <div className="btn-primary w-full justify-center text-xs py-2">
                      <Zap className="w-3 h-3" />
                      Optimize with AI
                    </div>
                  </div>
                </div>
                {/* Right panel - PDF preview mock */}
                <div className="p-6 bg-slate-800/20">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-4">PDF Preview</div>
                  <div className="bg-white rounded-lg p-4 h-48 overflow-hidden relative">
                    <div className="space-y-1.5">
                      <div className="h-3 bg-slate-800 rounded w-2/3 mx-auto" />
                      <div className="h-1 bg-slate-300 rounded w-1/2 mx-auto" />
                      <div className="mt-3 h-px bg-slate-200" />
                      <div className="h-2 bg-brand-400/80 rounded w-1/4 mt-2" />
                      {[80, 90, 70, 85, 60].map((w, i) => (
                        <div key={i} className="h-1.5 bg-slate-200 rounded" style={{ width: `${w}%` }} />
                      ))}
                      <div className="h-2 bg-brand-400/80 rounded w-1/4 mt-2" />
                      {[75, 65, 80].map((w, i) => (
                        <div key={i} className="h-1.5 bg-slate-200 rounded" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                    <div className="absolute bottom-2 right-2 glass rounded px-2 py-0.5 text-xs font-medium" style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      ATS: 94
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="section-badge mx-auto mb-4">How it works</motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-white mb-4">
              Four Steps to Your<br /><span className="gradient-text">Dream Job Interview</span>
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map(({ num, title, desc, color }, i) => (
              <motion.div
                key={num}
                className="glass-card p-6 gradient-border relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className={`text-4xl font-black mb-3 ${color} opacity-40 font-mono`}>{num}</div>
                <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="section-badge mx-auto mb-4">Features</motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-white mb-4">
              Everything You Need to<br /><span className="gradient-text">Get Hired</span>
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon, title, desc, color, border }, i) => (
              <motion.div
                key={title}
                className={`glass-card p-6 group hover:scale-[1.02] transition-transform duration-200 gradient-border border ${border}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 text-white`}>
                  {icon}
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <div className="glass-card p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 via-violet-600/5 to-transparent" />
            <div className="relative">
              <motion.div variants={fadeUp} className="section-badge mx-auto mb-6">Start for Free</motion.div>
              <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-white mb-4">
                Ready to Land More<br />
                <span className="gradient-text">Interviews?</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-slate-400 mb-8 max-w-lg mx-auto">
                Join thousands of job seekers who've boosted their ATS scores and landed more interviews with Resume.AI.
              </motion.p>
              <motion.div variants={fadeUp}>
                <Link to="/register" className="btn-primary w-full sm:w-auto max-w-[280px] sm:max-w-none justify-center px-5 sm:px-10 py-3 sm:py-4 text-sm sm:text-base leading-tight shadow-glow-lg">
                  <span className="sm:hidden">Optimize My Resume</span>
                  <span className="hidden sm:inline">Optimize My Resume — It's Free</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded overflow-hidden ring-1 ring-white/10">
            <img src="/Resume.AI.jpeg" alt="Resume.AI logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-bold text-white">Resume<span className="gradient-text">.AI</span></span>
        </div>
        <p className="text-xs text-slate-600">© 2026 Resume.AI • Powered by Resume.AI</p>
      </footer>
    </div>
  )
}
