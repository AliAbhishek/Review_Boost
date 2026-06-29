import { useState, useRef } from 'react'
import { useParams, Navigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import confetti from 'canvas-confetti'
import { ArrowLeft, Gift, ClipboardCheck, ExternalLink } from 'lucide-react'

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

  const [stage, setStage] = useState<Stage>('rating')
  const [selectedStars, setSelectedStars] = useState(0)
  const [reviews, setReviews] = useState<ReviewOption[]>([])
  const [activeVoucher, setActiveVoucher] = useState<Voucher | null>(null)
  const [copied, setCopied] = useState(false)
  const hasLaunched = useRef(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackForm>({ resolver: zodResolver(feedbackSchema) })

  const accentColor = restaurant?.logoColor ?? '#6366f1'
  const bizConfig = restaurant?.businessType ? BUSINESS_CONFIG[restaurant.businessType] : BUSINESS_CONFIG.other

  const launchConfetti = () => {
    if (hasLaunched.current) return
    hasLaunched.current = true
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: [accentColor, '#ffffff', '#fbbf24'] })
  }

  const handleStarSelect = async (stars: number) => {
    setSelectedStars(stars)
    if (stars <= 2) { setStage('private-feedback'); return }
    setStage('loading')
    try {
      const data = await reviewApi.generateReviews(slug ?? '', stars)
      setReviews(data.reviews)
      setStage('reviews')
    } catch {
      setStage('rating')
    }
  }

  const handleUseReview = async (text: string) => {
    // Copy review text to clipboard so customer can paste on Google
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Clipboard blocked in some browsers — silent fail, redirect still works
    }

    const result = await reviewApi.logReview({ slug: slug ?? '', stars: selectedStars, reviewText: text, wasEdited: false, token: emailToken })
    if (result.voucher) setActiveVoucher(result.voucher)

    // Prefer direct write-review URL, fall back to listing URL
    const isZomato = result.reviewLog.submittedTo === 'zomato' && restaurant?.zomatoUrl
    const redirectUrl = isZomato
      ? restaurant!.zomatoUrl!
      : (restaurant?.googleReviewUrl ?? restaurant?.googleMapsUrl ?? '')

    if (redirectUrl) {
      setTimeout(() => window.open(redirectUrl, '_blank', 'noopener,noreferrer'), 1200)
    }
    setStage('thank-you')
    setTimeout(launchConfetti, 600)
  }

  const onSubmitFeedback = async (data: FeedbackForm) => {
    const result = await reviewApi.submitPrivateFeedback({ slug: slug ?? '', stars: selectedStars, feedback: data.feedback, token: emailToken })
    if (result.voucher) setActiveVoucher(result.voucher)
    setStage('thank-you')
    setTimeout(launchConfetti, 300)
  }

  if (!slug) return <Navigate to="/404" replace />
  if (isLoading) return <PageLoader />
  if (isError || !restaurant) return <Navigate to="/404" replace />

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <div className="w-full max-w-sm mx-auto min-h-screen flex flex-col px-5 pt-10 pb-8">

        <header className="flex flex-col items-center gap-3 mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold ring-4 ring-white shadow-sm"
            style={{ backgroundColor: accentColor }}
          >
            {restaurant.name.charAt(0)}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <h1 className="text-lg font-bold text-gray-900">{restaurant.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{restaurant.cuisine} · {restaurant.city}</p>
          </motion.div>
        </header>

        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">

            {stage === 'rating' && (
              <motion.div
                key="rating"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center gap-8"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{bizConfig.question}</h2>
                  <p className="text-gray-400 text-sm mt-1.5">Tap a star to rate your experience</p>
                </div>
                <StarRating onRate={handleStarSelect} selected={selectedStars} accentColor={accentColor} />
                <div className="w-full flex justify-between text-xs text-gray-300 px-1">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
              </motion.div>
            )}

            {stage === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-3"
              >
                <div className="text-center mb-1">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-7 h-7 border-2 rounded-full mx-auto mb-3"
                    style={{ borderColor: `${accentColor}30`, borderTopColor: accentColor }}
                  />
                  <p className="text-sm text-gray-400">Writing your perfect review…</p>
                </div>
                {[0, 1, 2].map((i) => <ReviewCardSkeleton key={i} />)}
              </motion.div>
            )}

            {stage === 'reviews' && (
              <motion.div
                key="reviews"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-3"
              >
                <div className="text-center mb-1">
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">Choose your review</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Pick one — it'll be copied & Google Maps will open</p>
                </div>
                {reviews.map((review, i) => (
                  <ReviewCard key={review.style} review={review} index={i} accentColor={accentColor} onUse={handleUseReview} />
                ))}
                <button
                  onClick={() => setStage('rating')}
                  className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors py-2 mt-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Re-rate
                </button>
              </motion.div>
            )}

            {stage === 'private-feedback' && (
              <motion.div
                key="private"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl mx-auto mb-4">
                    😔
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">We're sorry to hear that</h2>
                  <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                    Share what went wrong — your feedback goes directly to the team.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmitFeedback)} className="flex flex-col gap-4">
                  <div>
                    <textarea
                      {...register('feedback')}
                      rows={5}
                      placeholder="Tell us what happened…"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 resize-none transition-all"
                    />
                    {errors.feedback && (
                      <p className="text-red-400 text-xs mt-1.5">{errors.feedback.message}</p>
                    )}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: accentColor }}
                  >
                    {isSubmitting ? 'Submitting…' : 'Send feedback'}
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

            {stage === 'thank-you' && (
              <motion.div
                key="thankyou"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                className="flex flex-col items-center gap-5 text-center py-6"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center text-3xl"
                >
                  🎉
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Thank you!</h2>
                  <p className="text-gray-400 text-sm mt-2 leading-relaxed max-w-xs mx-auto">
                    Your review means a lot to the team at{' '}
                    <span className="font-medium text-gray-600">{restaurant.name}</span>.
                  </p>
                </div>
                {copied ? (
                  <div className="w-full bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
                    <ClipboardCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Review copied to clipboard!</p>
                      <p className="text-xs text-green-600 mt-0.5 leading-relaxed">
                        Google opened in a new tab. Just paste (<span className="font-mono">Ctrl+V</span> / <span className="font-mono">⌘V</span>) and tap Post.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-start gap-3">
                    <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Google Maps opened in a new tab — paste your review there to help others discover this place.
                    </p>
                  </div>
                )}

                {activeVoucher && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="w-full"
                  >
                    <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-5 text-left">
                      <div className="flex items-center gap-2 mb-3">
                        <Gift className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Your reward</span>
                      </div>
                      <p className="text-gray-900 font-bold text-lg leading-tight">{activeVoucher.title}</p>
                      <p className="text-gray-500 text-sm mt-1">{activeVoucher.description}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="bg-white border-2 border-dashed border-amber-300 rounded-xl px-4 py-2">
                          <span className="font-mono font-bold text-amber-700 text-lg tracking-widest">{activeVoucher.code}</span>
                        </div>
                        <span className="text-xs text-gray-400">Valid {activeVoucher.expiryDays} days</span>
                      </div>
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

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    </div>
  )
}
