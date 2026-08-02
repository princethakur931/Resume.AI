import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Settings, Briefcase, ChevronRight, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function ProfileDropdown() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const profileMenuRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarLoadError, setAvatarLoadError] = useState(false)

  const normalizedAvatar = typeof user?.profilePhoto === 'string' ? user.profilePhoto.trim() : ''
  const shouldShowAvatar = Boolean(normalizedAvatar) && !avatarLoadError

  useEffect(() => {
    const handleClickOutside = e => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setAvatarLoadError(false)
  }, [normalizedAvatar])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleOpenProfile = () => {
    setMenuOpen(false)
    navigate('/profile')
  }

  return (
    <div className="relative" ref={profileMenuRef}>
      <button
        onClick={() => setMenuOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-white/[0.06] hover:border-brand-500/40 transition-colors"
      >
        <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center ring-1 ring-white/10">
          {shouldShowAvatar ? (
            <img
              src={normalizedAvatar}
              alt="Profile"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setAvatarLoadError(true)}
            />
          ) : (
            <span className="text-[10px] font-semibold text-white">{(user?.name || 'U').charAt(0).toUpperCase()}</span>
          )}
        </div>
        <span className="text-xs text-slate-400 hidden sm:block">{user?.name}</span>
        <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${menuOpen ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-950/95 backdrop-blur-md border border-white/[0.12] shadow-2xl p-2 z-[60]"
          >
            <div className="px-3 py-2 border-b border-white/[0.06]">
              <p className="text-xs text-slate-400">Signed in as</p>
              <p className="text-sm text-white font-medium truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleOpenProfile}
              className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] text-left text-sm text-slate-300"
            >
              <Settings className="w-4 h-4" />
              Profile Settings
            </button>
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] text-left text-sm text-slate-300"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              to="/jobs"
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] text-left text-sm text-slate-300"
            >
              <Briefcase className="w-4 h-4" />
              Browse Jobs
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-left text-sm text-red-300"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
