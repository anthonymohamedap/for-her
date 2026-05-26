'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { setIdentity } from '@/lib/identity'
import type { Identity } from '@/lib/supabase'

interface IdentityScreenProps {
  onChoose: (identity: Identity) => void
}

export default function IdentityScreen({ onChoose }: IdentityScreenProps) {
  const [chosen, setChosen] = useState<Identity | null>(null)

  function handleChoice(id: Identity) {
    setChosen(id)
    setIdentity(id)
    setTimeout(() => onChoose(id), 800)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center ambient-glow"
    >
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-garden-purple/40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              delay: Math.random() * 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="text-center z-10"
      >
        <motion.p
          className="font-caveat text-white/40 text-lg mb-3 tracking-widest uppercase"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          Our Little Garden
        </motion.p>

        <h1
          className="font-cormorant text-5xl md:text-6xl font-light text-garden-ivory mb-2"
          style={{ textShadow: '0 0 40px rgba(192,132,252,0.3)' }}
        >
          Who are you?
        </h1>

        <p className="font-caveat text-white/30 text-base mb-14">
          Step into the garden
        </p>

        <div className="flex gap-8 justify-center">
          {(['anthony', 'yeon'] as Identity[]).map((id) => (
            <motion.button
              key={id}
              onClick={() => handleChoice(id)}
              disabled={chosen !== null}
              whileHover={{ scale: 1.06, y: -4 }}
              whileTap={{ scale: 0.97 }}
              animate={
                chosen === id
                  ? { scale: 1.1, opacity: 1 }
                  : chosen !== null
                  ? { scale: 0.9, opacity: 0.3 }
                  : {}
              }
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`
                relative px-10 py-5 rounded-2xl font-cormorant text-2xl font-light
                border backdrop-blur-sm transition-all duration-300
                ${id === 'anthony'
                  ? 'border-garden-purple/40 text-garden-purple hover:border-garden-purple bg-garden-purple/5 hover:bg-garden-purple/10'
                  : 'border-garden-pink/40 text-garden-pink hover:border-garden-pink bg-garden-pink/5 hover:bg-garden-pink/10'
                }
              `}
              style={{
                boxShadow: id === 'anthony'
                  ? '0 0 30px rgba(192,132,252,0.1)'
                  : '0 0 30px rgba(244,114,182,0.1)',
              }}
            >
              <span className="capitalize tracking-wide">
                {id === 'anthony' ? 'Anthony' : 'Yeon'}
              </span>
              {/* Subtle flower accent */}
              <motion.span
                className="absolute -top-2 -right-2 text-sm"
                animate={{ rotate: [0, 15, 0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                {id === 'anthony' ? '🌷' : '🌸'}
              </motion.span>
            </motion.button>
          ))}
        </div>

        {chosen && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-caveat text-white/50 text-base mt-10"
          >
            Welcome back, {chosen === 'anthony' ? 'Anthony' : 'Yeon'} ✦
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  )
}
