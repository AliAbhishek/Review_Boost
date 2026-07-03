import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'

interface StarRatingProps {
  onRate: (stars: number) => void
  selected?: number
  disabled?: boolean
  accentColor?: string
}

const LABELS = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Excellent!']
const EMOJIS = ['', '😞', '😕', '😐', '😊', '🤩']

export default function StarRating({ onRate, selected = 0, disabled = false, accentColor = '#f59e0b' }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || selected

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="flex gap-2 justify-center"
        role="group"
        aria-label="Star rating"
        onMouseLeave={() => setHovered(0)}
      >
        <span className="sr-only" aria-live="polite">
          {selected ? `${selected} star${selected > 1 ? 's' : ''} selected` : ''}
        </span>
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onRate(star)}
            onMouseEnter={() => !disabled && setHovered(star)}
            onTouchStart={() => !disabled && setHovered(star)}
            onTouchEnd={() => setHovered(0)}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            whileHover={{ scale: disabled ? 1 : 1.15, y: disabled ? 0 : -4 }}
            whileTap={{ scale: disabled ? 1 : 0.85 }}
            animate={{ scale: selected === star ? [1, 1.35, 1] : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className={cn(
              'p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-full touch-manipulation select-none',
              disabled && 'cursor-default',
            )}
          >
            <motion.svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill={star <= active ? accentColor : 'none'}
              stroke={star <= active ? accentColor : '#d1d5db'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{
                fill:   star <= active ? accentColor : 'none',
                stroke: star <= active ? accentColor : '#d1d5db',
                scale:  star <= active && star === active ? 1.1 : 1,
              }}
              transition={{ duration: 0.12, delay: star <= active ? (star - 1) * 0.04 : 0 }}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </motion.svg>
          </motion.button>
        ))}
      </div>

      {/* Emotion label */}
      <div className="h-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {active > 0 && (
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.9 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex items-center gap-2"
            >
              <span className="text-xl">{EMOJIS[active]}</span>
              <span className="font-semibold text-gray-700 text-base">{LABELS[active]}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
