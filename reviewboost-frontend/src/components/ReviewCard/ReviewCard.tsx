import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Check, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ReviewOption } from '@/types/review'

interface ReviewCardProps {
  review: ReviewOption
  index: number
  accentColor: string
  onUse: (text: string) => Promise<void>
}

const styleLabels: Record<ReviewOption['style'], string> = {
  casual: 'Casual',
  detailed: 'Detailed',
  short: 'Short',
}

export default function ReviewCard({ review, index, accentColor, onUse }: ReviewCardProps) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showFull, setShowFull] = useState(false)

  const handleUse = async () => {
    if (busy) return
    setBusy(true)
    try {
      await navigator.clipboard.writeText(review.text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = review.text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    await onUse(review.text)
    setBusy(false)
  }

  const isLong = review.text.length > 200

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: 'easeOut' }}
      className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3"
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full w-fit">
        {styleLabels[review.style]}
      </span>

      <div>
        <p className={cn('text-gray-700 text-sm leading-relaxed', !showFull && 'line-clamp-4')}>
          {review.text}
        </p>
        {isLong && (
          <button
            onClick={() => setShowFull((v) => !v)}
            className="text-xs text-indigo-500 hover:text-indigo-600 mt-1 transition-colors"
          >
            {showFull ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleUse}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-70"
        style={{ backgroundColor: accentColor }}
        aria-label={`Use ${review.style} review`}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied! Opening Maps…
          </>
        ) : (
          <>
            Use this review
            <ExternalLink className="w-4 h-4" />
          </>
        )}
      </motion.button>
    </motion.div>
  )
}

export function ReviewCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3 animate-pulse">
      <div className="h-5 w-16 bg-gray-100 rounded-full" />
      <div className="space-y-2">
        <div className="h-3.5 bg-gray-100 rounded w-full" />
        <div className="h-3.5 bg-gray-100 rounded w-5/6" />
        <div className="h-3.5 bg-gray-100 rounded w-4/6" />
      </div>
      <div className="h-11 bg-gray-100 rounded-xl" />
    </div>
  )
}
