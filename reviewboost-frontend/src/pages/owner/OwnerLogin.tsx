import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap, Star, TrendingUp, Users } from 'lucide-react'
import { ownerApi } from '@/api/ownerApi'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'At least 6 characters'),
})
type FormData = z.infer<typeof schema>

const FEATURES = [
  { icon: Star, text: 'AI-generated review suggestions' },
  { icon: TrendingUp, text: 'Real-time review analytics' },
  { icon: Users, text: 'QR code for instant feedback' },
]

const FOOD_ITEMS = [
  { e: '🍕', x: '8%',  y: '12%', d: 6,   delay: 0 },
  { e: '🍜', x: '82%', y: '8%',  d: 7,   delay: 1 },
  { e: '🥗', x: '15%', y: '78%', d: 5.5, delay: 0.5 },
  { e: '🍰', x: '76%', y: '75%', d: 6.5, delay: 1.5 },
  { e: '☕', x: '45%', y: '5%',  d: 5,   delay: 2 },
  { e: '🥂', x: '90%', y: '42%', d: 7.5, delay: 0.8 },
]

export default function OwnerLogin() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      const res = await ownerApi.login(data)
      login(res.token, res.owner)
      navigate('/dashboard')
    } catch {
      setApiError('Invalid email or password.')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0d0500 0%, #1a0a00 40%, #0a0d00 100%)',
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 500, height: 500,
            top: '-10%', left: '-10%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 400, height: 400,
            bottom: '-5%', right: '5%',
            background: 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)',
          }}
        />
        <div className="absolute inset-0 dot-grid opacity-30" />

        {/* Floating food */}
        {FOOD_ITEMS.map((item, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl select-none pointer-events-none"
            style={{ left: item.x, top: item.y }}
            animate={{ y: [0, -18, 0], rotateZ: [0, 8, -8, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: item.d, repeat: Infinity, ease: 'easeInOut', delay: item.delay }}
          >
            {item.e}
          </motion.div>
        ))}

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black text-white">ReviewBoost</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-black text-white leading-tight">
              Turn every meal into
              <br />
              <span className="text-gradient-amber">a 5‑star story.</span>
            </h2>
            <p className="text-white/40 mt-4 text-base leading-relaxed max-w-sm">
              Let AI craft perfect reviews for your happy customers. Boost your online reputation effortlessly.
            </p>
          </motion.div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  <Icon className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-sm text-white/60">{text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative z-10 rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            ))}
          </div>
          <p className="text-white/60 text-sm italic">
            "ReviewBoost tripled our Google reviews in one month. The AI suggestions are spot-on!"
          </p>
          <p className="text-white/30 text-xs mt-2">— Rahul S., The Spice Garden, Mumbai</p>
        </motion.div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex flex-col items-center justify-center w-full lg:w-[420px] flex-shrink-0 bg-white p-8">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-gray-900 text-lg">ReviewBoost</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900">Welcome back</h1>
            <p className="text-gray-400 text-sm mt-1">Sign in to manage your restaurant</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@restaurant.com"
                className="w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-300 transition-all outline-none"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#f59e0b')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl border text-sm text-gray-900 placeholder-gray-300 transition-all outline-none"
                  style={{ borderColor: '#e5e7eb' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#f59e0b')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl px-4 py-3 text-xs text-red-600 bg-red-50 border border-red-100"
              >
                {apiError}
              </motion.div>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 btn-gradient-amber mt-2"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in →'}
            </motion.button>
          </form>

          <p className="text-xs text-gray-300 text-center mt-8">
            Need an account?{' '}
            <span className="text-amber-500 font-semibold cursor-pointer hover:text-amber-600">
              Contact us
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
