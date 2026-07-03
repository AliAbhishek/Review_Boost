import { useState, useRef } from 'react'
import { useParams, Navigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import confetti from 'canvas-confetti'
import { ArrowLeft, Gift, ClipboardCheck, Copy, Check } from 'lucide-react'

import { useRestaurant } from '@/hooks/useRestaurant'
import { reviewApi } from '@/api/reviewApi'
import StarRating from '@/components/StarRating/StarRating'
import ReviewCard, { ReviewCardSkeleton } from '@/components/ReviewCard/ReviewCard'
import { BUSINESS_CONFIG } from '@/types/restaurant'
import type { ReviewOption } from '@/types/review'
import type { Voucher } from '@/types/voucher'

const feedbackSchema = z.object({
  feedback: z.string().min(10, 'Please share at least 10 characters'),
})
type FeedbackForm = z.infer<typeof feedbackSchema>

type Stage = 'rating' | 'loading' | 'reviews' | 'private-feedback' | 'thank-you'

export default function CustomerReviewPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const emailToken = searchParams.get('token') ?? undefined

  const { data: restaurant, isLoading, isError } = useRestaurant(slug ?? '')

  const [stage, setStage]               = useState<Stage>('rating')
  const [selectedStars, setSelectedStars] = useState(0)
  const [reviews, setReviews]           = useState<ReviewOption[]>([])
  const [activeVoucher, setActiveVoucher] = useState<Voucher | null>(null)
  const [redemptionCode, setRedemptionCode] = useState<string | null>(null)
  const [codeCopied, setCodeCopied]     = useState(false)
  const [reviewCopied, setReviewCopied] = useState(false)
  const hasLaunched = useRef(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackForm>({ resolver: zodResolver(feedbackSchema) })

  const accentColor = restaurant?.logoColor ?? '#6366f1'
  const bizConfig   = restaurant?.businessType ? BUSINESS_CONFIG[restaurant.businessType] : BUSINESS_CONFIG.other

  const launchConfetti = () => {
    if (hasLaunched.current) return
    hasLaunched.current = true
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.55 }, colors: [accentColor, '#ffffff', '#fbbf24', '#a78bfa'] })
    setTimeout(() => {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6, x: 0.2 }, colors: [accentColor, '#fbbf24'] })
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6, x: 0.8 }, colors: ['#a78bfa', '#ffffff'] })
    }, 300)
  }

  const handleStarSelect = async (stars: number) => {
    setSelectedStars(stars)
    if (stars <= 2) { setStage('private-feedback'); return }
    setStage('loading')
    try {
      const data = await reviewApi.generateReviews(slug ?? '', stars, emailToken)
      setReviews(data.reviews)
      setStage('reviews')
    } catch {
      setStage('rating')
    }
  }

  const handleUseReview = async (text: string) => {
    setReviewCopied(true)
    const result = await reviewApi.logReview({
      slug: slug ?? '', stars: selectedStars, reviewText: text, wasEdited: false, token: emailToken,
    })
    if (result.voucher)       setActiveVoucher(result.voucher)
    if (result.redemptionCode) setRedemptionCode(result.redemptionCode)

    const isZomato  = result.reviewLog.submittedTo === 'zomato' && restaurant?.zomatoUrl
    const redirectUrl = isZomato
      ? restaurant!.zomatoUrl!
      : (restaurant?.googleReviewUrl ?? restaurant?.googleMapsUrl ?? '')

    if (redirectUrl) {
      setTimeout(() => window.open(redirectUrl, '_blank', 'noopener,noreferrer'), 1000)
    }
    setStage('thank-you')
    setTimeout(launchConfetti, 500)
  }

  const onSubmitFeedback = async (data: FeedbackForm) => {
    const result = await reviewApi.submitPrivateFeedback({
      slug: slug ?? '', stars: selectedStars, feedback: data.feedback, token: emailToken,
    })
    if (result.voucher)       setActiveVoucher(result.voucher)
    if (result.redemptionCode) setRedemptionCode(result.redemptionCode)
    setStage('thank-you')
    setTimeout(launchConfetti, 300)
  }

  const copyVoucherCode = async (code: string) => {
    try { await navigator.clipboard.writeText(code) } catch { /* ignore */ }
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2500)
  }

  if (!slug)                    return <Navigate to="/404" replace />
  if (isLoading)                return <PageLoader accentColor="#6366f1" />
  if (isError || !restaurant)   return <Navigate to="/404" replace />

  const progressStep = stage === 'rating' ? 0 : stage === 'loading' || stage === 'reviews' ? 1 : 2

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: `linear-gradient(160deg, ${accentColor}12 0%, #f9fafb 40%)` }}
    >
      <div className="w-full max-w-sm mx-auto min-h-screen flex flex-col px-5 pt-10 pb-8">

        {/* Header */}
        <header className="flex flex-col items-center gap-3 mb-8">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black ring-4 ring-white shadow-lg shadow-black/10"
            style={{ backgroundColor: accentColor }}
          >
            {restaurant.name.charAt(0)}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="text-center"
          >
            <h1 className="text-lg font-bold text-gray-900">{restaurant.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{restaurant.cuisine} · {restaurant.city}</p>
          </motion.div>

          {/* Progress dots */}
          {stage !== 'private-feedback' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mt-1"
            >
              {['Rate', 'Review', 'Done'].map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <motion.div
                      animate={{
                        backgroundColor: i <= progressStep ? accentColor : '#e5e7eb',
                        scale: i === progressStep ? 1.2 : 1,
                      }}
                      transition={{ duration: 0.3 }}
                      className="w-2 h-2 rounded-full"
                    />
                    <span className="text-[9px] font-semibold uppercase tracking-wider"
                      style={{ color: i <= progressStep ? accentColor : '#d1d5db' }}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <motion.div
                      animate={{ backgroundColor: i < progressStep ? accentColor : '#e5e7eb' }}
                      transition={{ duration: 0.3 }}
                      className="w-8 h-0.5 rounded-full mb-3"
                    />
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </header>

        {/* Stage content */}
        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">

            {/* ── Rating ── */}
            {stage === 'rating' && (
              <motion.div
                key="rating"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center gap-8"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">{bizConfig.question}</h2>
                  <p className="text-gray-400 text-sm mt-1.5">Tap a star to continue</p>
                </div>
                <StarRating onRate={handleStarSelect} selected={selectedStars} accentColor={accentColor} />
              </motion.div>
            )}

            {/* ── Loading ── */}
            {stage === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                <div className="text-center mb-2">
                  <div className="flex items-center justify-center gap-1.5 mb-4">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.2, ease: 'easeInOut' }}
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: accentColor }}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-gray-600">Writing your perfect review…</p>
                  <p className="text-xs text-gray-400 mt-1">Our AI is crafting 3 options for you</p>
                </div>
                {[0, 1, 2].map((i) => <ReviewCardSkeleton key={i} />)}
              </motion.div>
            )}

            {/* ── Review selection ── */}
            {stage === 'reviews' && (
              <motion.div
                key="reviews"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-3"
              >
                <div className="text-center mb-1">
                  <div className="flex items-center justify-center gap-0.5 mb-1.5">
                    {[1,2,3,4,5].map((s) => (
                      <svg key={s} width="16" height="16" viewBox="0 0 24 24"
                        fill={s <= selectedStars ? accentColor : 'none'}
                        stroke={s <= selectedStars ? accentColor : '#d1d5db'}
                        strokeWidth="1.5">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">Choose your review</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Pick one, edit if you like, then post to Google</p>
                </div>
                {reviews.map((review, i) => (
                  <ReviewCard key={review.style} review={review} index={i} accentColor={accentColor} onUse={handleUseReview} />
                ))}
                <button
                  onClick={() => setStage('rating')}
                  className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors py-2 mt-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Change rating
                </button>
              </motion.div>
            )}

            {/* ── Private feedback ── */}
            {stage === 'private-feedback' && (
              <motion.div
                key="private"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                    className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-3xl mx-auto mb-4"
                  >
                    😔
                  </motion.div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">We're sorry to hear that</h2>
                  <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                    Your feedback goes directly to the team — not online. Thank you for taking the time.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmitFeedback)} className="flex flex-col gap-4">
                  <div>
                    <textarea
                      {...register('feedback')}
                      rows={5}
                      placeholder="Tell us what happened…"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-all"
                      style={{ '--tw-ring-color': `${accentColor}50` } as React.CSSProperties}
                    />
                    {errors.feedback && (
                      <p className="text-red-400 text-xs mt-1.5">{errors.feedback.message}</p>
                    )}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: accentColor }}
                  >
                    {isSubmitting ? 'Sending…' : 'Send feedback'}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => setStage('rating')}
                    className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Go back
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Thank you ── */}
            {stage === 'thank-you' && (
              <motion.div
                key="thankyou"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                className="flex flex-col items-center gap-5 text-center py-4"
              >
                <motion.div
                  animate={{ scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] }}
                  transition={{ delay: 0.3, duration: 0.6, ease: 'easeInOut' }}
                  className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-lg shadow-black/5"
                  style={{ backgroundColor: `${accentColor}18` }}
                >
                  🎉
                </motion.div>

                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Thank you!</h2>
                  <p className="text-gray-400 text-sm mt-2 leading-relaxed max-w-xs mx-auto">
                    Your review means a lot to everyone at{' '}
                    <span className="font-semibold text-gray-600">{restaurant.name}</span>.
                  </p>
                </div>

                {reviewCopied && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3 text-left"
                  >
                    <ClipboardCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Review copied!</p>
                      <p className="text-xs text-green-600 mt-0.5 leading-relaxed">
                        Google opened in a new tab — just paste (<span className="font-mono">Ctrl+V</span> / <span className="font-mono">⌘V</span>) and tap Post.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Personalized voucher code */}
                {redemptionCode && activeVoucher && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, type: 'spring', stiffness: 200, damping: 24 }}
                    className="w-full"
                  >
                    <div
                      className="w-full rounded-2xl p-5 text-left border"
                      style={{ background: `linear-gradient(135deg, ${accentColor}10, ${accentColor}1a)`, borderColor: `${accentColor}30` }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Gift className="w-4 h-4" style={{ color: accentColor }} />
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: accentColor }}>
                          Your reward
                        </span>
                      </div>
                      <p className="text-gray-900 font-bold text-base leading-tight">{activeVoucher.title}</p>
                      <p className="text-gray-500 text-sm mt-1 mb-4">{activeVoucher.description}</p>

                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 border-2 border-dashed rounded-xl px-4 py-2.5 flex items-center justify-center"
                          style={{ borderColor: `${accentColor}50` }}
                        >
                          <span className="font-mono font-black text-base tracking-widest" style={{ color: accentColor }}>
                            {redemptionCode}
                          </span>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => copyVoucherCode(redemptionCode)}
                          className="w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-colors flex-shrink-0"
                          style={{
                            borderColor: codeCopied ? accentColor : `${accentColor}40`,
                            backgroundColor: codeCopied ? `${accentColor}15` : 'white',
                          }}
                          aria-label="Copy voucher code"
                        >
                          {codeCopied
                            ? <Check className="w-4 h-4" style={{ color: accentColor }} />
                            : <Copy className="w-4 h-4 text-gray-400" />
                          }
                        </motion.button>
                      </div>
                      <p className="text-xs text-gray-400 mt-3 text-center">
                        Valid for {activeVoucher.expiryDays} days · Show this code when ordering
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <footer className="mt-auto pt-8 text-center">
          <p className="text-xs text-gray-300">
            Powered by <span className="font-semibold text-gray-400">ReviewBoost</span>
          </p>
        </footer>
      </div>
    </div>
  )
}

function PageLoader({ accentColor }: { accentColor: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.2 }}
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          ))}
        </div>
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    </div>
  )
}
