'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { getAllMemories } from '@/lib/supabase'
import { computeStreak } from '@/lib/streak'
import { getIdentity, getDisplayName } from '@/lib/identity'
import type { Identity } from '@/lib/supabase'

function partnerName(identity: Identity | null): string {
  if (!identity) return 'them'
  return identity === 'anthony' ? 'Yeon' : 'Anthony'
}

function relativeTime(isoStr: string): string {
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M12 2C12 2 7 8 7 13a5 5 0 0 0 10 0c0-3-2-6-2-6s-1 3-3 4c0 0 1-5 0-9z" fill="#E88FB5" opacity="0.9" />
      <path d="M12 19a2 2 0 0 1-2-2c0-1.5 2-3 2-3s2 1.5 2 3a2 2 0 0 1-2 2z" fill="#f9a8d4" />
    </svg>
  )
}

interface ZoneData {
  streak: number
  totalDays: number
  partnerLastSeen: string | null
  partnerName: string
}

export default function MiddleZone({ openingDone }: { openingDone: boolean }) {
  const [data, setData] = useState<ZoneData | null>(null)

  useEffect(() => {
    const identity = getIdentity()
    const partner = identity === 'anthony' ? 'yeon' : 'anthony'

    getAllMemories()
      .then(memories => {
        const { currentStreak, totalSharedDays } = computeStreak(memories)
        const partnerMemories = memories
          .filter(m => m.identity === partner)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
        setData({
          streak: currentStreak,
          totalDays: totalSharedDays,
          partnerLastSeen: partnerMemories[0]?.created_at ?? null,
          partnerName: partnerName(identity),
        })
      })
      .catch(() => {})
  }, [])

  const cardStyle: React.CSSProperties = {
    background: 'var(--card-bg)',
    backdropFilter: 'var(--card-blur)',
    WebkitBackdropFilter: 'var(--card-blur)',
    border: '1px solid var(--card-border)',
    borderRadius: 16,
    padding: '12px 16px',
  }

  return (
    <AnimatePresence>
      {openingDone && (
        /*
          CENTERING FIX:
          Outer div owns all positioning (left/right/top + centering via flex).
          Inner motion.div only handles opacity/y animation — never touches transform.
          This prevents Framer Motion from clobbering translateX(-50%).
        */
        <div
          style={{
            position: 'absolute',
            // On mobile: below the player pill (~80px) and above characters (~45% from bottom)
            // On desktop: below the top bar (64px), centered in the sky zone
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 6,
            width: 'min(280px, calc(100vw - 48px))',
            // Shift upward so it sits in the sky, not over the characters
            marginTop: '-8vh',
            pointerEvents: 'auto',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ delay: 1.2, duration: 1.0, ease: 'easeOut' }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {data && (
              <>
                {/* Partner presence */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: data.partnerLastSeen ? 'var(--accent-pink)' : 'rgba(255,255,255,0.2)',
                      boxShadow: data.partnerLastSeen ? '0 0 8px var(--accent-pink)' : 'none',
                    }} />
                    <span style={{
                      fontSize: 13, color: 'var(--text-primary)',
                      fontFamily: "'Caveat', cursive", letterSpacing: '0.02em',
                    }}>
                      {data.partnerName}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                      {data.partnerLastSeen ? relativeTime(data.partnerLastSeen) : 'not yet today'}
                    </span>
                  </div>
                </div>

                {/* Streak counter */}
                <Link href="/today" style={{ textDecoration: 'none' }}>
                  <motion.div
                    style={{ ...cardStyle, cursor: 'pointer' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FlameIcon />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {data.streak > 0
                          ? `${data.streak}-day streak`
                          : `${data.totalDays} days in the garden`}
                      </span>
                    </div>
                    {data.totalDays > 0 && data.streak !== data.totalDays && (
                      <p style={{ margin: '4px 0 0 24px', fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                        {data.totalDays} shared {data.totalDays === 1 ? 'day' : 'days'} total
                      </p>
                    )}
                  </motion.div>
                </Link>

                {/* Drop a moment CTA */}
                <Link href="/today" style={{ textDecoration: 'none' }}>
                  <motion.div
                    style={{
                      ...cardStyle,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 8, cursor: 'pointer',
                      background: 'rgba(232,143,181,0.07)',
                      borderColor: 'rgba(232,143,181,0.15)',
                    }}
                    whileHover={{ scale: 1.02, background: 'rgba(232,143,181,0.12)' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span style={{ fontSize: 14 }}>📸</span>
                    <span style={{
                      fontSize: 13, color: 'var(--accent-pink)',
                      fontFamily: "'Caveat', cursive", letterSpacing: '0.03em',
                    }}>
                      drop a moment
                    </span>
                  </motion.div>
                </Link>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
