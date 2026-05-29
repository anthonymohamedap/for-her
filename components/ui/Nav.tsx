'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { getIdentity, getDisplayName } from '@/lib/identity'
import { useEffect, useState } from 'react'
import type { Identity } from '@/lib/supabase'

interface NavProps {
  hidden?: boolean
}

// Garden leaf icon
function GardenIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path
        d="M12 22C12 22 3 16 3 9.5a9 9 0 0 1 18 0C21 16 12 22 12 22z"
        fill={active ? 'var(--accent-pink)' : 'none'}
        stroke={active ? 'var(--accent-pink)' : 'rgba(255,255,255,0.45)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 22V12"
        stroke={active ? 'var(--accent-pink)' : 'rgba(255,255,255,0.45)'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Calendar icon
function TodayIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <rect
        x="3" y="4" width="18" height="17" rx="2"
        fill={active ? 'rgba(232,143,181,0.18)' : 'none'}
        stroke={active ? 'var(--accent-pink)' : 'rgba(255,255,255,0.45)'}
        strokeWidth="1.5"
      />
      <path
        d="M3 9h18"
        stroke={active ? 'var(--accent-pink)' : 'rgba(255,255,255,0.45)'}
        strokeWidth="1.5"
      />
      <path
        d="M8 4V2M16 4V2"
        stroke={active ? 'var(--accent-pink)' : 'rgba(255,255,255,0.45)'}
        strokeWidth="1.5" strokeLinecap="round"
      />
      {active && (
        <circle cx="12" cy="15" r="2" fill="var(--accent-pink)" />
      )}
    </svg>
  )
}

export default function Nav({ hidden }: NavProps) {
  const pathname = usePathname()
  const [identity, setIdentity] = useState<Identity | null>(null)

  useEffect(() => {
    setIdentity(getIdentity())
  }, [])

  if (hidden) return null

  return (
    <>
      {/* ── Desktop top-center pill nav ─────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="hidden md:flex fixed top-4 left-1/2 -translate-x-1/2 z-40 gap-6
                   bg-black/30 backdrop-blur-md rounded-full px-5 py-2
                   border border-white/10"
      >
        <Link
          href="/"
          className={`font-caveat text-base tracking-wide transition-all duration-300 ${
            pathname === '/'
              ? 'text-garden-purple text-glow-purple'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          🌸 Garden
        </Link>
        <Link
          href="/today"
          className={`font-caveat text-base tracking-wide transition-all duration-300 ${
            pathname === '/today'
              ? 'text-garden-pink text-glow-pink'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          📷 Today Together
        </Link>
      </motion.nav>

      {/* ── Mobile bottom bar ──────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
        style={{
          height: 'var(--bar-height-mobile)',
          background: 'rgba(5, 3, 15, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Link
          href="/"
          className="flex flex-col items-center justify-center gap-1"
          style={{ minWidth: 'var(--touch-target)', minHeight: 'var(--touch-target)' }}
        >
          <GardenIcon active={pathname === '/'} />
          <span
            style={{
              fontSize: 10,
              color: pathname === '/' ? 'var(--accent-pink)' : 'rgba(255,255,255,0.35)',
              fontFamily: 'var(--font-caveat, Caveat, cursive)',
              letterSpacing: '0.04em',
            }}
          >
            Garden
          </span>
        </Link>

        <Link
          href="/today"
          className="flex flex-col items-center justify-center gap-1"
          style={{ minWidth: 'var(--touch-target)', minHeight: 'var(--touch-target)' }}
        >
          <TodayIcon active={pathname === '/today'} />
          <span
            style={{
              fontSize: 10,
              color: pathname === '/today' ? 'var(--accent-pink)' : 'rgba(255,255,255,0.35)',
              fontFamily: 'var(--font-caveat, Caveat, cursive)',
              letterSpacing: '0.04em',
            }}
          >
            Today
          </span>
        </Link>
      </motion.nav>

      {/* Identity display — bottom left (desktop only) */}
      {identity && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="hidden md:block fixed bottom-4 left-4 z-40 font-caveat text-sm text-white/30"
        >
          You are {getDisplayName(identity)} ✦
        </motion.div>
      )}
    </>
  )
}
