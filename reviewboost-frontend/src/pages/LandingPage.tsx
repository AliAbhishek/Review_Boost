import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import {
  Zap, Star, QrCode, Mail, Gift, BarChart2, ArrowRight,
  CheckCircle, ChevronDown, X, Smartphone, ClipboardCheck, ExternalLink, Menu,
} from 'lucide-react'
import { BUSINESS_TYPES, BUSINESS_CONFIG } from '@/types/restaurant'
import { publicApi } from '@/api/ownerApi'

// ─── Demo request form ───────────────────────────────────────────────────────

const demoSchema = z.object({
  businessName: z.string().min(2, 'Enter your business name'),
  email:        z.string().email('Enter a valid email'),
  businessType: z.enum(BUSINESS_TYPES, { error: 'Select a business type' }),
})
type DemoForm = z.infer<typeof demoSchema>

function DemoModal({ onClose }: { onClose: () => void }) {
  const [done, setDone] = useState(false)
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DemoForm>({
    resolver: zodResolver(demoSchema),
    defaultValues: { businessType: 'restaurant' },
  })

  const onSubmit = async (data: DemoForm) => {
    setApiError('')
    try {
      await publicApi.requestDemo(data)
      setDone(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Something went wrong. Please try again.'
      setApiError(msg)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative">
          <button onClick={onClose} className="absolute top-5 right-5 text-gray-300 hover:text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>

          {done ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Check your inbox!</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                We've sent you an invite link to set up your ReviewBoost dashboard. It usually arrives within a minute.
              </p>
              <button onClick={onClose} className="mt-6 w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-black text-gray-900">ReviewBoost</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900">Get started free</h2>
                <p className="text-gray-400 text-sm mt-1">14-day trial. No credit card required.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Business Name</label>
                  <input
                    {...register('businessName')}
                    placeholder="The Grand Kitchen"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                  {errors.businessName && <p className="text-red-400 text-xs mt-1">{errors.businessName.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Business Type</label>
                  <select
                    {...register('businessType')}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer bg-white"
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>{BUSINESS_CONFIG[t].label}</option>
                    ))}
                  </select>
                  {errors.businessType && <p className="text-red-400 text-xs mt-1">{errors.businessType.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Your Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@business.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                </div>

                {apiError && (
                  <div className="rounded-xl px-4 py-3 text-xs text-red-600 bg-red-50 border border-red-100">
                    {apiError}
                  </div>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Sending invite…' : <>Get started free <ArrowRight className="w-4 h-4" /></>}
                </motion.button>

                <p className="text-center text-xs text-gray-400">
                  Already have an account?{' '}
                  <Link to="/login" className="text-indigo-500 font-semibold hover:text-indigo-700">Sign in</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </>
  )
}

// ─── Sections ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: QrCode,
    color: 'indigo',
    title: 'Set up in 2 minutes',
    body: 'Tell us your business name and type. We generate a QR code instantly — no app, no install needed.',
  },
  {
    icon: Smartphone,
    color: 'violet',
    title: 'Customer scans & gets a draft',
    body: 'AI writes 3 personalised review options based on your services. Customer picks one — or edits it.',
  },
  {
    icon: ClipboardCheck,
    color: 'blue',
    title: 'One tap to Google',
    body: 'The review is auto-copied to clipboard. Google\'s review form opens. Customer pastes and posts in seconds.',
  },
]

const FEATURES = [
  { icon: Star,      title: 'AI review drafts',      body: 'Claude AI writes personalised 3-style review options for every customer — casual, detailed, and short.' },
  { icon: Mail,      title: 'Email follow-up',        body: 'Add customer emails after their visit. A follow-up email with a personalised review link goes out automatically after 3 hours.' },
  { icon: Gift,      title: 'Voucher rewards',        body: 'Set up a discount code that appears on the thank-you screen after a review is submitted. Give customers a reason to post.' },
  { icon: QrCode,    title: 'Instant QR code',        body: 'Your unique QR code is ready to print for tables, receipts, or your counter — no tech skills required.' },
  { icon: BarChart2, title: 'Owner dashboard',        body: 'Track scans, average rating, monthly trend, email campaign conversion, and review quality — all in one place.' },
  { icon: ExternalLink, title: 'Direct Google link',  body: 'Paste your Google write-a-review URL once. Every customer lands on the review form directly — no searching required.' },
]

const PRICING = [
  {
    name: 'Trial',
    price: 'Free',
    period: '14 days',
    highlight: false,
    features: ['1 business location', 'AI review generation', 'QR code', 'Owner dashboard'],
  },
  {
    name: 'Basic',
    price: '₹999',
    period: 'per month',
    highlight: false,
    features: ['Everything in Trial', 'Email follow-up campaigns', 'Voucher reward system', 'Review analytics'],
  },
  {
    name: 'Pro',
    price: '₹2,499',
    period: 'per month',
    highlight: true,
    features: ['Everything in Basic', 'Unlimited locations', 'Priority support', 'Custom branding', 'Advanced analytics'],
  },
]

const FAQS = [
  {
    q: 'Can ReviewBoost post directly to Google for me?',
    a: 'No — and neither can any other tool, legally. Google does not expose a public API for writing reviews. What ReviewBoost does is remove every other obstacle: the AI writes the review, the clipboard auto-fills it, and Google opens directly to the review form. Customers just paste and post.',
  },
  {
    q: 'How does the email follow-up work?',
    a: 'You add a customer\'s name and email after their visit. 3 hours later they automatically receive a personalised email with a link to your review page. The link tracks who reviewed so you can see your conversion rate.',
  },
  {
    q: 'What types of businesses can use ReviewBoost?',
    a: 'Restaurants, salons, spas, clinics, gyms, hotels, and any other local business that relies on Google reviews. The AI adapts its language to your business type.',
  },
  {
    q: 'How long does setup take?',
    a: 'Under 2 minutes. Enter your business name, type, and email. We send you a dashboard invite. You set up your Google review link and print your QR code. Done.',
  },
]

function FAQ() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="space-y-3">
      {FAQS.map((faq, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <span className="font-semibold text-gray-900 text-sm pr-4">{faq.q}</span>
            <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </motion.div>
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-50 pt-3">{faq.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-600">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-gray-900">ReviewBoost</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
              Get started free
            </motion.button>
          </div>
          {/* Mobile hamburger */}
          <button className="sm:hidden p-2 text-gray-500" onClick={() => setMobileMenuOpen((v) => !v)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="sm:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3"
            >
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-gray-700 py-2">Sign in</Link>
              <button onClick={() => { setShowModal(true); setMobileMenuOpen(false) }}
                className="w-full py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl">
                Get started free
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-5">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Star className="w-3.5 h-3.5 fill-indigo-500" />
              AI-powered review generation
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-tight tracking-tight mb-5">
              Turn happy customers<br className="hidden sm:block" />
              {' '}into <span className="text-indigo-600">5-star reviews</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed max-w-xl mx-auto mb-8">
              ReviewBoost writes the review for your customer. They scan a QR code, pick from 3 AI-drafted options, and post to Google in under 30 seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setShowModal(true)}
                className="w-full sm:w-auto px-7 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-base shadow-lg shadow-indigo-600/25"
              >
                Start free trial <ArrowRight className="w-5 h-5" />
              </motion.button>
              <Link
                to="/login"
                className="w-full sm:w-auto px-7 py-4 bg-white border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 transition-colors text-base text-center"
              >
                Sign in to dashboard
              </Link>
            </div>
            <p className="text-xs text-gray-400 mt-4">14-day free trial · No credit card required</p>
          </motion.div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="bg-white border-y border-gray-100 py-8 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: '3x', label: 'More reviews per month' },
              { value: '30s', label: 'Average review time' },
              { value: '4.7★', label: 'Avg. rating for customers' },
              { value: '60%', label: 'Email-to-review conversion' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-black text-indigo-600">{value}</p>
                <p className="text-xs text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3">How it works</h2>
            <p className="text-gray-500">From setup to your first review in under 3 minutes</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-3xl border border-gray-100 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-${step.color}-50`}>
                    <step.icon className={`w-5 h-5 text-${step.color}-500`} />
                  </div>
                  <span className="text-2xl font-black text-gray-100">{i + 1}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-5 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3">Everything you need</h2>
            <p className="text-gray-500">A complete review management system, not just a link</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="p-5 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors group"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                  <f.icon className="w-4 h-4 text-indigo-500" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3">Simple pricing</h2>
            <p className="text-gray-500">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl p-6 border ${plan.highlight ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100'}`}
              >
                {plan.highlight && (
                  <div className="inline-block text-xs font-bold bg-white/20 text-white px-2.5 py-1 rounded-full mb-3">
                    Most popular
                  </div>
                )}
                <h3 className={`font-black text-lg mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-3xl font-black ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                </div>
                <p className={`text-xs mb-5 ${plan.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{plan.period}</p>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? 'text-indigo-200' : 'text-green-500'}`} />
                      <span className={plan.highlight ? 'text-indigo-100' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowModal(true)}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${
                    plan.highlight
                      ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                      : 'bg-gray-50 text-gray-900 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Get started
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-5 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900">Frequently asked</h2>
          </div>
          <FAQ />
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-5">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-indigo-600 rounded-3xl p-10"
          >
            <h2 className="text-3xl font-black text-white mb-3">Ready to get more reviews?</h2>
            <p className="text-indigo-200 mb-7 text-sm leading-relaxed">
              Set up takes 2 minutes. Your first review could come in today.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setShowModal(true)}
              className="px-8 py-4 bg-white text-indigo-600 font-black rounded-2xl hover:bg-indigo-50 transition-colors inline-flex items-center gap-2"
            >
              Start free trial <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-600">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black text-gray-900">ReviewBoost</span>
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} ReviewBoost. All rights reserved.</p>
          <Link to="/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Owner login
          </Link>
        </div>
      </footer>

      {/* Modal */}
      <AnimatePresence>
        {showModal && <DemoModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  )
}
