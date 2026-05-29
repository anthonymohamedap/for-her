'use client'

import './globals.css'
import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { getIdentity } from '@/lib/identity'
import type { Identity } from '@/lib/supabase'
import IdentityScreen from '@/components/ui/IdentityScreen'
import Nav from '@/components/ui/Nav'
import AudioToggle from '@/components/ui/AudioToggle'
import DesktopTopBar from '@/components/ui/DesktopTopBar'
import DesktopSpotifyPanel from '@/components/ui/DesktopSpotifyPanel'
import { getPanelOpen, subscribePanelOpen } from '@/lib/panelStore'

const PANEL_W = 300

function PanelShift({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(getPanelOpen())

  useEffect(() => subscribePanelOpen(() => setOpen(getPanelOpen())), [])

  return (
    <div
      style={{
        marginLeft: open ? PANEL_W : 0,
        transition: 'margin-left 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {children}
    </div>
  )
}

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
            {/* Mobile: bottom bar nav */}
            <Nav />
            {/* Desktop unified top bar */}
            <DesktopTopBar />
            {/* Desktop side panel */}
            <DesktopSpotifyPanel />
            <AudioToggle />
            {/* Desktop: shift content right when panel open */}
            <div className="hidden md:block">
              <PanelShift>{children}</PanelShift>
            </div>
            {/* Mobile: normal */}
            <div className="md:hidden">{children}</div>
          </>
        )}
      </body>
    </html>
  )
}
