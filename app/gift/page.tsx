'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAllMemories } from '@/lib/supabase'
import { computeStreak } from '@/lib/streak'
import { useRouter } from 'next/navigation'

const MILESTONE = 7
const GIFT_CODE = 'PLACEHOLDER-CODE'
const MESSAGE = `you made it to ${MILESTONE} days 🌸\n\nthis is for you — spend it on something you love, no excuses needed.\n\ni'm proud of us.`

export default function GiftPage() {
  const router = useRouter()
  const [unlocked, setUnlocked] = useState<boolean | null>(null)
  const [opened, setOpened] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const identity = typeof window !== 'undefined' ? localStorage.getItem('garden_identity') : null
    if (identity === 'anthony') { setUnlocked(true); return }
    getAllMemories().then(mems => {
      const { currentStreak, longestStreak } = computeStreak(mems)
      setUnlocked(currentStreak >= MILESTONE || longestStreak >= MILESTONE)
    })
  }, [])

  function handleCopy() {
    navigator.clipboard.writeText(GIFT_CODE).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (unlocked === null) return null

  if (!unlocked) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: 'rgba(255,240,255,0.8)', marginBottom: 8 }}>
            something is waiting
          </p>
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: 'rgba(200,150,255,0.5)', fontStyle: 'italic' }}>
            keep going — it unlocks at {MILESTONE} days together
          </p>
        </motion.div>
        <motion.button
          onClick={() => router.back()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Caveat', cursive", fontSize: 13, color: 'rgba(200,130,255,0.35)' }}
        >
          ← back
        </motion.button>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-8 relative overflow-hidden">
      {/* Background petals */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: -20, x: Math.random() * 100 - 50 }}
          animate={{ opacity: [0, 0.6, 0], y: ['0vh', '110vh'], x: [0, (Math.random() - 0.5) * 80] }}
          transition={{ duration: 6 + Math.random() * 4, delay: i * 0.4, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'fixed',
            top: -20,
            left: `${10 + i * 7}%`,
            fontSize: 18,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          🌸
        </motion.div>
      ))}

      <AnimatePresence mode="wait">
        {!opened ? (
          /* Envelope */
          <motion.div
            key="envelope"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.8 }}
            style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.button
                onClick={() => setOpened(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
                }}
              >
                {/* Envelope SVG */}
                <svg width="160" height="120" viewBox="0 0 160 120" fill="none">
                  <rect x="4" y="24" width="152" height="92" rx="8" fill="rgba(168,85,247,0.15)" stroke="rgba(200,130,255,0.4)" strokeWidth="1.5" />
                  <path d="M4 32 L80 72 L156 32" stroke="rgba(200,130,255,0.5)" strokeWidth="1.5" fill="none" />
                  <path d="M4 116 L56 72" stroke="rgba(200,130,255,0.25)" strokeWidth="1" />
                  <path d="M156 116 L104 72" stroke="rgba(200,130,255,0.25)" strokeWidth="1" />
                  {/* Wax seal */}
                  <circle cx="80" cy="80" r="14" fill="rgba(249,168,212,0.2)" stroke="rgba(249,168,212,0.5)" strokeWidth="1.5" />
                  <text x="80" y="85" textAnchor="middle" fontSize="14" fill="rgba(249,168,212,0.8)">🌸</text>
                </svg>
              </motion.button>
            </motion.div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: 'rgba(255,240,255,0.85)', margin: 0 }}>
                something for you
              </p>
              <p style={{ fontFamily: "'Caveat', cursive", fontSize: 13, color: 'rgba(200,130,255,0.45)', fontStyle: 'italic', marginTop: 6 }}>
                tap to open
              </p>
            </div>
          </motion.div>
        ) : (
          /* Letter */
          <motion.div
            key="letter"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              zIndex: 1,
              maxWidth: 360,
              width: '100%',
              background: 'rgba(15,5,30,0.7)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(200,130,255,0.2)',
              borderRadius: 20,
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              boxShadow: '0 0 60px rgba(168,85,247,0.15)',
            }}
          >
            {/* Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              {MESSAGE.split('\n').map((line, i) => (
                <p key={i} style={{
                  fontFamily: line.includes('🌸') ? "'Cormorant Garamond', serif" : "'Caveat', cursive",
                  fontSize: line.includes('🌸') ? 20 : 16,
                  color: line.includes('🌸') ? 'rgba(249,168,212,0.95)' : 'rgba(220,200,255,0.8)',
                  margin: '0 0 8px',
                  lineHeight: 1.6,
                  fontStyle: line && !line.includes('🌸') ? 'italic' : 'normal',
                  minHeight: line === '' ? 8 : undefined,
                }}>
                  {line || ' '}
                </p>
              ))}
            </motion.div>

            {/* Gift code */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              style={{
                background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(200,130,255,0.25)',
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <p style={{ margin: 0, fontFamily: "'Caveat', cursive", fontSize: 12, color: 'rgba(200,130,255,0.5)', letterSpacing: '0.08em' }}>
                your gift code
              </p>
              <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 16, color: 'rgba(249,168,212,0.95)', letterSpacing: '0.12em' }}>
                {GIFT_CODE}
              </p>
              <button
                onClick={handleCopy}
                style={{
                  marginTop: 4,
                  padding: '6px 20px',
                  borderRadius: 50,
                  border: '1px solid rgba(200,130,255,0.3)',
                  background: copied ? 'rgba(168,85,247,0.25)' : 'none',
                  cursor: 'pointer',
                  fontFamily: "'Caveat', cursive",
                  fontSize: 13,
                  color: copied ? 'rgba(249,168,212,0.9)' : 'rgba(200,130,255,0.7)',
                  transition: 'all 0.2s',
                }}
              >
                {copied ? 'copied ✓' : 'copy code'}
              </button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              style={{ margin: 0, textAlign: 'center', fontFamily: "'Caveat', cursive", fontSize: 13, color: 'rgba(200,130,255,0.35)', fontStyle: 'italic' }}
            >
              — with love 🌷
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => router.back()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Caveat', cursive", fontSize: 13, color: 'rgba(200,130,255,0.3)', zIndex: 1 }}
      >
        ← back
      </motion.button>
    </main>
  )
}
