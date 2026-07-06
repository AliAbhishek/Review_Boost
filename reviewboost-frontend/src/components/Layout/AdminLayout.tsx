import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Store, LogOut, Zap, Bell, ChevronRight, Menu, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { useAdminStore } from '@/store/adminStore'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/admin/dashboard' },
  { icon: Store, label: 'Restaurants', to: '/admin/restaurants' },
]

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { admin, logout } = useAdminStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#03030c' }}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 flex flex-col transition-transform duration-300 md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ backgroundColor: '#06060f', borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-white tracking-tight">ReviewBoost</span>
          <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', color: '#a78bfa' }}>
            ADMIN
          </span>
          <button className="md:hidden ml-auto text-white/40 hover:text-white/70 transition-colors" onClick={() => setMobileOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                  isActive ? 'text-violet-300' : 'text-white/35 hover:text-white/70 hover:bg-white/4',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="admin-nav-bg"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className={cn('w-4 h-4 relative z-10 transition-colors', isActive ? 'text-violet-400' : 'text-white/30 group-hover:text-white/50')} />
                  <span className="relative z-10">{label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto relative z-10 text-violet-400/60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              {admin?.name?.charAt(0) ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/70 truncate">{admin?.name ?? 'Admin'}</p>
              <p className="text-[11px] text-white/25 truncate">{admin?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
            style={{ color: 'rgba(248,113,113,0.6)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(248,113,113,1)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(248,113,113,0.6)'; e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content — offset by sidebar on desktop */}
      <div className="md:ml-64 flex flex-col min-h-screen overflow-hidden">
        {/* Topbar */}
        <header
          className="h-16 flex items-center gap-3 px-4 md:px-8 flex-shrink-0 sticky top-0 z-30"
          style={{ backgroundColor: '#06060f', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <button
            className="md:hidden text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white/80 truncate">
              {greeting()}, {admin?.name?.split(' ')[0] ?? 'Admin'} 👋
            </p>
            <p className="text-xs text-white/25 hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          >
            <Bell className="w-4 h-4 text-white/40" />
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
