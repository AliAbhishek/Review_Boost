import { motion } from 'framer-motion'
import { LogOut, Zap, BarChart2, Star, Users, Gift, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

export const OWNER_TABS = [
  { id: 'overview',  label: 'Overview',   icon: BarChart2 },
  { id: 'reviews',   label: 'Reviews',    icon: Star      },
  { id: 'customers', label: 'Customers',  icon: Users     },
  { id: 'voucher',   label: 'Voucher',    icon: Gift      },
  { id: 'profile',   label: 'Profile',    icon: Settings  },
] as const

export type OwnerTabId = (typeof OWNER_TABS)[number]['id']

interface OwnerLayoutProps {
  children: ReactNode
  activeTab: OwnerTabId
  onTabChange: (tab: OwnerTabId) => void
}

export default function OwnerLayout({ children, activeTab, onTabChange }: OwnerLayoutProps) {
  const { owner, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col bg-white border-r border-gray-100 fixed inset-y-0 left-0 z-20">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-gray-900 tracking-tight text-base">ReviewBoost</span>
        </div>

        {/* Business info */}
        {owner && (
          <div className="px-5 py-3 border-b border-gray-50 flex-shrink-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Business</p>
            <p className="text-sm font-bold text-gray-800 truncate">{owner.name}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {OWNER_TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative text-left',
                  isActive ? 'text-indigo-700' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50',
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-indigo-50 border border-indigo-100"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={cn('w-4 h-4 relative z-10 flex-shrink-0', isActive ? 'text-indigo-500' : 'text-gray-400')} />
                <span className="relative z-10">{label}</span>
              </button>
            )
          })}
        </nav>

        {/* Upgrade card */}
        <div className="mx-2.5 mb-2.5 rounded-2xl p-4"
          style={{ background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)', border: '1px solid #e0e7ff' }}>
          <p className="text-xs font-black text-indigo-900 mb-0.5">Upgrade to Pro</p>
          <p className="text-[11px] text-indigo-400 mb-2.5">Unlimited reviews & analytics</p>
          <button className="w-full py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
            View Plans →
          </button>
        </div>

        {/* Logout */}
        <div className="p-2.5 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-medium text-red-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top header ─────────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-100 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="font-black text-gray-900 text-sm">ReviewBoost</span>
            {owner && <span className="text-xs text-gray-400 ml-1.5">{owner.name}</span>}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-60 pt-14 pb-20 md:pt-0 md:pb-0 min-h-screen overflow-x-hidden">
        {children}
      </main>

      {/* ── Mobile bottom tab bar ─────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {OWNER_TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 relative min-w-0"
              >
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute top-0 left-2 right-2 h-0.5 bg-indigo-600 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-indigo-600' : 'text-gray-400')} />
                <span className={cn('text-[10px] font-semibold leading-none truncate', isActive ? 'text-indigo-600' : 'text-gray-400')}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

    </div>
  )
}
