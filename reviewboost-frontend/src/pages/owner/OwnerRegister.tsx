import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { ownerApi } from '@/api/ownerApi'
import { useAuthStore } from '@/store/authStore'

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
type FormData = z.infer<typeof schema>

export default function OwnerRegister() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const restaurantId = searchParams.get('restaurant') ?? ''

  const [showPw, setShowPw] = useState(false)
  const [apiError, setApiError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm px-6">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invite Link</h1>
          <p className="text-sm text-gray-500">
            This link is missing a restaurant ID. Ask your administrator for a valid invite link.
          </p>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      const res = await ownerApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
        restaurantId,
      })
      login(res.token, res.owner)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Registration failed. Please try again.'
      setApiError(msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8"
      >
        <div className="flex items-center gap-2.5 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-black text-gray-900">ReviewBoost</span>
        </div>

        <div className="mb-7">
          <h1 className="text-2xl font-black text-gray-900">Create your account</h1>
          <p className="text-gray-400 text-sm mt-1">Set up your owner dashboard to start collecting reviews.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { name: 'name' as const, label: 'Your Name', type: 'text', placeholder: 'Rahul Sharma' },
            { name: 'email' as const, label: 'Email', type: 'email', placeholder: 'you@restaurant.com' },
          ].map(({ name, label, type, placeholder }) => (
            <div key={name}>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                {label}
              </label>
              <input
                {...register(name)}
                type={type}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 outline-none transition-all"
                onFocus={(e) => (e.currentTarget.style.borderColor = '#f59e0b')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
              {errors[name] && (
                <p className="text-red-500 text-xs mt-1">{errors[name]?.message}</p>
              )}
            </div>
          ))}

          {([
            { name: 'password' as const, label: 'Password' },
            { name: 'confirmPassword' as const, label: 'Confirm Password' },
          ] as const).map(({ name, label }) => (
            <div key={name}>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                {label}
              </label>
              <div className="relative">
                <input
                  {...register(name)}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 outline-none transition-all"
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#f59e0b')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                />
                {name === 'password' && (
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {errors[name] && (
                <p className="text-red-500 text-xs mt-1">{errors[name]?.message}</p>
              )}
            </div>
          ))}

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
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 mt-2"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
          >
            {isSubmitting ? 'Creating account…' : 'Create account →'}
          </motion.button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-amber-500 font-semibold hover:text-amber-600">
            Sign in
          </a>
        </p>
      </motion.div>
    </div>
  )
}
