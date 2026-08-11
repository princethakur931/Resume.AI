import { Link, useLocation } from 'react-router-dom'
import { Home, Briefcase, FileText, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function BottomNav() {
  const location = useLocation()
  const { user } = useAuth()

  const navItems = [
    { id: 'home', path: '/', icon: Home },
    { id: 'jobs', path: '/jobs', icon: Briefcase },
    { id: 'resume', path: '/dashboard', icon: FileText },
    { id: 'profile', path: '/profile', icon: User, isProfile: true },
  ]

  const getActiveId = () => {
    if (location.pathname.startsWith('/jobs')) return 'jobs'
    if (location.pathname === '/profile') return 'profile'
    if (location.pathname === '/dashboard') return 'resume'
    if (location.pathname === '/') return 'home'
    return 'home'
  }

  const activeId = getActiveId()

  const normalizedPhoto = typeof user?.profilePhoto === 'string' ? user.profilePhoto.trim() : ''
  const hasAvatar = Boolean(normalizedPhoto)

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f] border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-[56px] px-2">
        {navItems.map((item) => {
          const isCurrentlyActive = activeId === item.id;
          const Icon = item.icon

          return (
            <Link
              key={item.id}
              to={item.path}
              className="relative flex items-center justify-center w-12 h-12 transition-transform active:scale-95"
              aria-label={item.id}
            >
              {item.isProfile && hasAvatar ? (
                <div className={`w-[26px] h-[26px] rounded-full overflow-hidden ${isCurrentlyActive ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f]' : 'ring-1 ring-white/20'}`}>
                  <img 
                    src={normalizedPhoto} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <Icon 
                  className={`w-[26px] h-[26px] transition-colors duration-200 ${isCurrentlyActive ? 'text-white' : 'text-white/60 hover:text-white/90'}`} 
                  strokeWidth={isCurrentlyActive ? 2.5 : 2}
                  fill={isCurrentlyActive ? 'currentColor' : 'none'}
                />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
