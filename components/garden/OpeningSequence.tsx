'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInAmbient, fadeInPiano } from '@/components/ui/AudioToggle'

interface OpeningSequenceProps {
  onComplete: () => void
}

type Phase = 'dark' | 'firefly' | 'title' | 'done'

export default function OpeningSequence({ onComplete }: OpeningSequenceProps) {
  const [phase, setPhase] = useState<Phase>('dark')
  const [singleFirefly, setSingleFirefly] = useState({ x: 45, y: 55 })

  useEffect(() => {
    // Only show once per session
    const key = 'garden_opened'
    if (sessionStorage.getItem(key)) {
      onComplete()
      return
    }
    sessionStorage.setItem(key, '1')

    const t1 = setTimeout(() => {
      setPhase('firefly')
      fadeInAmbient()
    }, 800)

    // Animate single firefly
    const t2 = setTimeout(() => setPhase('title'), 2200)
    const t3 = setTimeout(() => {
      setPhase('done')
      fadeInPiano()
      onComplete()
    }, 5000)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  // Firefly drift
  useEffect(() => {
    if (phase !== 'firefly') return
    const interval = setInterval(() => {
      setSingleFirefly({
        x: 30 + Math.random() * 40,
        y: 30 + Math.random() * 40,
      })
    }, 600)
    return () => clearInterval(interval)
  }, [phase])

  if (phase === 'done') return null

  return (
    <AnimatePresence>
      <motion.div
        key="opening"
        className="fixed inset-0 z-[90] bg-black flex items-center justify-center"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      >
        {/* Single firefly */}
        <AnimatePresence>
          {(phase === 'firefly' || phase === 'title') && (
            <motion.div
              key="firefly"
              className="absolute pointer-events-none"
              animate={{ left: `${singleFirefly.x}%`, top: `${singleFirefly.y}%` }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              style={{ position: 'absolute' }}
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-garden-ivory"
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.4, 0.8] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 20, height: 20, left: -8, top: -8,
                  background: 'radial-gradient(circle, rgba(255,248,240,0.4) 0%, transparent 70%)',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Opening title */}
        <AnimatePresence>
          {phase === 'title' && (
            <motion.div
              key="title"
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
            >
              <motion.p
                className="font-caveat text-white/30 text-base tracking-widest uppercase mb-3"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                A private world for two
              </motion.p>
              <h1
                className="font-cormorant text-5xl md:text-7xl font-light text-garden-ivory"
                style={{ textShadow: '0 0 60px rgba(192,132,252,0.5)' }}
              >
                Our Little Garden
              </h1>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
