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

export default function Nav({ hidden }: NavProps) {
  const pathname = usePathname()
  const [identity, setIdentity] = useState<Identity | null>(null)

  useEffect(() => {
    setIdentity(getIdentity())
  }, [])

  if (hidden) return null

  return (
    <>
      {/* Top nav */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex gap-6
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

      {/* Identity display — bottom left */}
      {identity && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="fixed bottom-4 left-4 z-40 font-caveat text-sm text-white/30"
        >
          You are {getDisplayName(identity)} ✦
        </motion.div>
      )}
    </>
  )
}
