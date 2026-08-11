import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Briefcase, FileText, User } from 'lucide-react'

export default function BottomNav() {
  const location = useLocation()

  const navItems = [
    { id: 'home', path: '/', icon: Home },
    { id: 'jobs', path: '/jobs', icon: Briefcase },
    { id: 'resume', path: '/dashboard', icon: FileText },
    { id: 'profile', path: '/profile', icon: User },
  ]

  const getActiveId = () => {
    if (location.pathname.startsWith('/jobs')) return 'jobs'
    if (location.pathname === '/profile') return 'profile'
    if (location.pathname === '/dashboard') return 'resume'
    if (location.pathname === '/') return 'home'
    return 'home'
  }

  const activeId = getActiveId()

  return (
    <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
      <div className="bg-[#151515] rounded-full p-2 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/5">
        {navItems.map((item) => {
          const isCurrentlyActive = activeId === item.id;
          const Icon = item.icon

          return (
            <Link
              key={item.id}
              to={item.path}
              className="relative flex items-center justify-center w-14 h-14 rounded-full transition-colors"
            >
              {isCurrentlyActive && (
                <motion.div
                  layoutId="bottomNavBubble"
                  className="absolute inset-0 bg-gradient-to-r from-brand-600 to-violet-600 rounded-full shadow-glow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon 
                className={`w-[22px] h-[22px] relative z-10 transition-colors duration-300 ${isCurrentlyActive ? 'text-white' : 'text-white/60 hover:text-white/90'}`} 
                strokeWidth={isCurrentlyActive ? 2.5 : 2}
              />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
