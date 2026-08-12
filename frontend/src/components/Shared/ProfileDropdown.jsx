import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User, Briefcase, FileText, HelpCircle, Mail, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function ProfileDropdown() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const profileMenuRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleClickOutside = e => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="relative" ref={profileMenuRef}>
      <button 
        onClick={() => setMenuOpen(!menuOpen)} 
        className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] transition-colors text-slate-300 hover:text-white flex items-center justify-center"
      >
        <Menu className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 rounded-xl border border-white/[0.08] bg-surface-1 shadow-xl z-50 overflow-hidden backdrop-blur-xl"
          >
            <div className="flex flex-col py-1.5">
              <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                <User className="w-4 h-4 text-brand-400" />
                Profile
              </Link>
              <Link to="/jobs" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                <Briefcase className="w-4 h-4 text-violet-400" />
                Jobs
              </Link>
              <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                <FileText className="w-4 h-4 text-emerald-400" />
                Resumes
              </Link>
              
              <div className="h-px bg-white/[0.06] my-1.5 mx-3" />
              
              <button className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors w-full text-left" onClick={() => setMenuOpen(false)}>
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                Help
              </button>
              <button className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors w-full text-left" onClick={() => setMenuOpen(false)}>
                <Mail className="w-4 h-4 text-amber-400" />
                Contact us
              </button>

              <div className="h-px bg-white/[0.06] my-1.5 mx-3" />

              <button 
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
