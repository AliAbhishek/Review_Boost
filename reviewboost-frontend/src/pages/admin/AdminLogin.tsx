import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Zap, ShieldCheck } from 'lucide-react'
import { useAdminStore } from '@/store/adminStore'
import { adminApi } from '@/api/adminApi'

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'At least 6 characters'),
})
type FormData = z.infer<typeof schema>

const FLOATING = [
  { e: '🍽️', x: '7%',  y: '14%', s: '3.2rem', d: 7,   delay: 0   },
  { e: '⭐',  x: '88%', y: '10%', s: '2.4rem', d: 5.5, delay: 0.8 },
  { e: '🥂',  x: '78%', y: '68%', s: '2.8rem', d: 6.5, delay: 1.5 },
  { e: '🍕',  x: '12%', y: '72%', s: '3rem',   d: 6,   delay: 0.5 },
  { e: '☕',  x: '46%', y: '6%',  s: '2.6rem', d: 5,   delay: 2   },
  { e: '🍰',  x: '93%', y: '40%', s: '2.4rem', d: 7.5, delay: 1   },
  { e: '🌟',  x: '2%',  y: '48%', s: '1.8rem', d: 4.5, delay: 1.8 },
  { e: '🍜',  x: '58%', y: '90%', s: '2.8rem', d: 6.2, delay: 0.3 },
]

export default function AdminLogin() {
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated)
  const login = useAdminStore((s) => s.login)
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [apiError, setApiError] = useState('')

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useTransform(mouseY, [-160, 160], [8, -8])
  const rotateY = useTransform(mouseX, [-160, 160], [-8, 8])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  if (isAuthenticated) return <Navigate to="/admin/dashboard" replace />

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left - rect.width / 2)
    mouseY.set(e.clientY - rect.top - rect.height / 2)
  }

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      const res = await adminApi.login(data)
      login(res.token, res.admin)
      navigate('/admin/dashboard')
    } catch {
      setApiError('Invalid credentials. Please try again.')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
      style={{ backgroundColor: '#03030c' }}
    >
      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid opacity-60" />

      {/* Ambient orbs */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 700, height: 700,
          top: '-20%', left: '-15%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 600, height: 600,
          bottom: '-15%', right: '-10%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 350, height: 350,
          top: '35%', right: '18%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.14) 0%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
      />

      {/* Floating restaurant elements */}
      {FLOATING.map((item, i) => (
        <motion.div
          key={i}
          className="absolute select-none pointer-events-none"
          style={{ left: item.x, top: item.y, fontSize: item.s }}
          animate={{ y: [0, -22, 0], rotateZ: [0, 10, -8, 0], opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: item.d, repeat: Infinity, ease: 'easeInOut', delay: item.delay }}
        >
          {item.e}
        </motion.div>
      ))}

      {/* Card wrapper for 3D tilt */}
      <div
        className="relative z-10 w-full max-w-md"
        style={{ perspective: '1200px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { mouseX.set(0); mouseY.set(0) }}
      >
        <motion.div
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          transition={{ type: 'spring', stiffness: 180, damping: 28 }}
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="glass-dark rounded-3xl p-8 shadow-2xl"
        >
          {/* Subtle inner glow border */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(255,255,255,0.03)' }} />

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <motion.div
              className="relative"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg glow-violet"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
              >
                <Zap className="w-8 h-8 text-white" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 flex items-center justify-center"
                style={{ borderColor: '#03030c' }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <ShieldCheck className="w-2.5 h-2.5 text-green-900" />
              </motion.div>
            </motion.div>

            <div className="text-center">
              <h1 className="text-2xl font-black tracking-tight">
                <span className="text-white">Review</span>
                <span className="text-gradient-violet">Boost</span>
              </h1>
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-violet-400/70">
                Admin Panel
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Welcome back</h2>
            <p className="text-sm text-white/35 mt-0.5">Sign in to your admin dashboard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-white/40 mb-1.5 uppercase tracking-widest">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="admin@reviewboost.com"
                className="input-dark"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-white/40 mb-1.5 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-dark pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl px-4 py-3 text-xs text-red-400"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {apiError}
              </motion.div>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isSubmitting}
              className="relative w-full py-3.5 rounded-xl text-sm font-bold text-white overflow-hidden disabled:opacity-50 mt-2 btn-gradient-violet"
            >
              <motion.div
                className="absolute inset-0 bg-white/10"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.5 }}
              />
              {isSubmitting ? 'Signing in…' : 'Sign in to Admin →'}
            </motion.button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs text-white/20">All systems operational</p>
          </div>
        </motion.div>
      </div>

      <p className="absolute bottom-4 text-[11px] text-white/12 select-none">
        ReviewBoost Admin · Secure Access Only
      </p>
    </div>
  )
}
