'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

// Neutral-tone messages — no romantic assumptions
const MESSAGES = [
  'This reminded me of you.',
  'One flower at a time.',
  'Future restaurant review partner.',
  'Even far away, we still shared today.',
  'I saved you the good piece.',
  'You would have loved this.',
  'Same moon, different sky.',
  'Saved this just for you.',
  'Thought of you instantly.',
  'Would 100% drag you here.',
]

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
    const HOLD_MS   = 6000
    const CYCLE_MS  = 18000
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
          <motion.div
            key={msgIdx}
            initial={{ opacity: 0, y: 0, filter: 'blur(4px)', scale: 0.95 }}
            animate={{ opacity: 1, y: -40, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, y: -80, filter: 'blur(3px)', scale: 0.92 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            style={{
              // Frosted glass pill
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 20,
              padding: '5px 12px',
              display: 'inline-block',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              className="font-caveat text-sm md:text-base"
              style={{
                color: 'rgba(255,255,255,0.52)',
                fontStyle: 'italic',
                textShadow: '0 0 16px rgba(192,132,252,0.35)',
                letterSpacing: '0.01em',
              }}
            >
              &ldquo;{MESSAGES[msgIdx]}&rdquo;
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
