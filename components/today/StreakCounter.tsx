'use client'

import { motion } from 'framer-motion'

interface StreakCounterProps {
  streak: number
  totalDays: number
}

export default function StreakCounter({ streak, totalDays }: StreakCounterProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center mb-10"
    >
      <motion.p
        className="font-caveat text-2xl md:text-3xl text-garden-ivory"
        style={{ textShadow: '0 0 20px rgba(192,132,252,0.5)' }}
        animate={streak > 0 ? { scale: [1, 1.03, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {streak > 0 ? (
          <>🌸 {streak} {streak === 1 ? 'day' : 'days'} in the garden together</>
        ) : (
          <>Start your garden journey 🌱</>
        )}
      </motion.p>

      {totalDays > 0 && streak !== totalDays && (
        <p className="font-caveat text-white/30 text-sm mt-1">
          {totalDays} shared {totalDays === 1 ? 'day' : 'days'} total
        </p>
      )}

      {streak >= 7 && (
        <motion.p
          className="font-caveat text-garden-purple text-sm mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {streak >= 14 ? '✨ Your garden is in full bloom' : '🌿 Your garden is growing beautifully'}
        </motion.p>
      )}
    </motion.div>
  )
}
