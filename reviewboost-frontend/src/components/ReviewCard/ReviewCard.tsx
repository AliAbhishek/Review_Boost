import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Pencil, Check, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ReviewOption } from '@/types/review'

interface ReviewCardProps {
  review: ReviewOption
  index: number
  accentColor: string
  onUse: (text: string) => Promise<void>
}

const styleLabels: Record<ReviewOption['style'], { label: string; color: string }> = {
  casual:   { label: 'Casual',   color: 'bg-blue-50 text-blue-500' },
  detailed: { label: 'Detailed', color: 'bg-purple-50 text-purple-500' },
  short:    { label: 'Short',    color: 'bg-teal-50 text-teal-500' },
}

type CardState = 'idle' | 'editing' | 'posting'

export default function ReviewCard({ review, index, accentColor, onUse }: ReviewCardProps) {
  const [state, setState] = useState<CardState>('idle')
  const [editedText, setEditedText] = useState(review.text)

  const meta = styleLabels[review.style]

  const handleEdit = () => {
    setEditedText(review.text)
    setState('editing')
  }

  const handlePost = async () => {
    setState('posting')
    try {
      await navigator.clipboard.writeText(editedText)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = editedText
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.focus(); ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    await onUse(editedText)
    setState('idle')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3, ease: 'easeOut' }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full', meta.color)}>
            {meta.label}
          </span>
          <span className="text-xs text-gray-300">{review.text.split(' ').length} words</span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {state === 'editing' ? (
            <motion.div
              key="editing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-2"
            >
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={6}
                className="w-full text-sm text-gray-700 leading-relaxed border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                autoFocus
              />
              <p className="text-[11px] text-gray-400">Feel free to personalise — it'll sound more authentic.</p>
            </motion.div>
          ) : (
            <motion.p
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-700 text-sm leading-relaxed line-clamp-4"
            >
              {review.text}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {state === 'editing' ? (
            <motion.div
              key="edit-actions"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-2"
            >
              <button
                onClick={() => setState('idle')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handlePost}
                className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
                style={{ backgroundColor: accentColor }}
              >
                <ExternalLink className="w-4 h-4" />
                Post to Google →
              </motion.button>
            </motion.div>
          ) : state === 'posting' ? (
            <motion.div
              key="posting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: accentColor }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Opening Maps…
            </motion.div>
          ) : (
            <motion.div
              key="idle-actions"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-2"
            >
              <button
                onClick={handleEdit}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handlePost}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
                style={{ backgroundColor: accentColor }}
              >
                <Check className="w-4 h-4" />
                Use this
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export function ReviewCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
        <div className="h-4 w-12 bg-gray-100 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-3.5 bg-gray-100 rounded w-full" />
        <div className="h-3.5 bg-gray-100 rounded w-5/6" />
        <div className="h-3.5 bg-gray-100 rounded w-3/4" />
        <div className="h-3.5 bg-gray-100 rounded w-4/6" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-20 bg-gray-100 rounded-xl" />
        <div className="h-10 flex-1 bg-gray-100 rounded-xl" />
      </div>
    </div>
  )
}
