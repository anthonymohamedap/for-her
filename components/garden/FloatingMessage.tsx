'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const MESSAGES = [
  'This reminded me of you.',
  'One flower at a time.',
  'Future restaurant review partner.',
  'Even far away, we still shared today.',
  'I saved you the good piece.',
  'Thinking of you right now.',
  'You make everything softer.',
  'Same moon, different sky.',
  'Counting the days.',
  'You would have loved this.',
]

// Spread positions across the screen — both center and sides
const POSITIONS = [
  { x: 12, y: 32 },
  { x: 58, y: 22 },
]

interface FloatingMessageProps {
  index: number
}

export default function FloatingMessage({ index }: FloatingMessageProps) {
  const [visible, setVisible] = useState(false)
  const [msgIdx, setMsgIdx] = useState(index % MESSAGES.length)

  const pos = POSITIONS[index % POSITIONS.length]

  useEffect(() => {
    // Each instance shows a message, holds 4s, then fades out; repeats every ~18s
    const HOLD_MS = 6000   // 2s fade-in + 4s hold
    const CYCLE_MS = 18000
    const STAGGER_MS = index * 5500

    let hideTimer: ReturnType<typeof setTimeout>

    function showNext() {
      setMsgIdx(Math.floor(Math.random() * MESSAGES.length))
      setVisible(true)
      hideTimer = setTimeout(() => setVisible(false), HOLD_MS)
    }

    const startTimer = setTimeout(() => {
      showNext()
      const interval = setInterval(showNext, CYCLE_MS)
      return () => clearInterval(interval)
    }, STAGGER_MS)

    return () => {
      clearTimeout(startTimer)
      clearTimeout(hideTimer)
    }
  }, [index])

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: 10 }}
    >
      <AnimatePresence>
        {visible && (
          <motion.p
            key={msgIdx}
            className="font-caveat text-sm md:text-base text-white/50 whitespace-nowrap"
            style={{
              textShadow: '0 0 20px rgba(192,132,252,0.4)',
              fontStyle: 'italic',
            }}
            initial={{ opacity: 0, y: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: -40, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -80, filter: 'blur(3px)' }}
            transition={{ duration: 2, ease: 'easeOut' }}
          >
            &ldquo;{MESSAGES[msgIdx]}&rdquo;
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
