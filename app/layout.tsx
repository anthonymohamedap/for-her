'use client'

import './globals.css'
import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { getIdentity } from '@/lib/identity'
import type { Identity } from '@/lib/supabase'
import IdentityScreen from '@/components/ui/IdentityScreen'
import Nav from '@/components/ui/Nav'
import AudioToggle from '@/components/ui/AudioToggle'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null | undefined>(undefined)
  const [showOpening, setShowOpening] = useState(false)

  useEffect(() => {
    const stored = getIdentity()
    setIdentity(stored)
    if (stored) setShowOpening(true)
  }, [])

  function handleIdentityChosen(id: Identity) {
    setIdentity(id)
    setTimeout(() => setShowOpening(true), 900)
  }

  // Still loading identity from localStorage
  if (identity === undefined) {
    return (
      <html lang="en">
        <body className="ambient-glow min-h-screen" />
      </html>
    )
  }

  return (
    <html lang="en">
      <body className="ambient-glow min-h-screen">
        <AnimatePresence mode="wait">
          {!identity && (
            <IdentityScreen key="identity" onChoose={handleIdentityChosen} />
          )}
        </AnimatePresence>

        {identity && (
          <>
            <Nav />
            <AudioToggle />
            {children}
          </>
        )}
      </body>
    </html>
  )
}
