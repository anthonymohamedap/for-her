'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'

// Global audio state
let howls: Record<string, any> = {}
let audioEnabled = false
let Howl: any = null
let readyPromise: Promise<void> | null = null

// Sound definitions — missing files are silently skipped via onloaderror
const SOUND_DEFS: Record<string, { src: string; loop?: boolean; volume: number; html5?: boolean }> = {
  ambient: { src: '/sounds/ambient.mp3', loop: true, volume: 0,    html5: true },
  piano:   { src: '/sounds/piano.mp3',   loop: true, volume: 0,    html5: true },
  bark:    { src: '/sounds/bark.mp3',               volume: 0.15 },
  sneeze:  { src: '/sounds/sneeze.mp3',             volume: 0.15 },
  squeak:  { src: '/sounds/squeak.mp3',             volume: 0.15 },
  snore:   { src: '/sounds/snore.mp3',   loop: true, volume: 0.1  },
}

function ensureReady(): Promise<void> {
  if (readyPromise) return readyPromise
  readyPromise = (async () => {
    if (!Howl) {
      const mod = await import('howler')
      Howl = mod.Howl
    }
    for (const [name, def] of Object.entries(SOUND_DEFS)) {
      if (howls[name] !== undefined) continue  // already created
      try {
        howls[name] = new Howl({
          src: [def.src],
          loop: def.loop ?? false,
          volume: def.volume,
          html5: def.html5 ?? false,
          onloaderror: () => { howls[name] = null },
        })
      } catch {
        howls[name] = null
      }
    }
  })()
  return readyPromise
}

function safePlay(name: string, volume: number, fadeDuration = 0) {
  const h = howls[name]
  if (!h) return
  try {
    h.volume(0)
    h.play()
    if (fadeDuration > 0) h.fade(0, volume, fadeDuration)
    else h.volume(volume)
  } catch {}
}

function safeStop(name: string) {
  const h = howls[name]
  if (!h) return
  try { h.stop() } catch {}
}

// Called by OpeningSequence — no-ops if audio not yet enabled
export function fadeInAmbient() {
  if (!audioEnabled || !howls.ambient) return
  safePlay('ambient', 0.08, 3000)
}

export function fadeInPiano() {
  if (!audioEnabled || !howls.piano) return
  safePlay('piano', 0.12, 4000)
}

export function playSound(name: string) {
  if (!audioEnabled || !howls[name]) return
  try {
    if (name === 'snore') { safeStop('bark'); safeStop('squeak') }
    else if (['bark', 'squeak', 'sneeze'].includes(name)) safeStop('snore')
    howls[name].volume(name === 'snore' ? 0.1 : 0.15)
    howls[name].play()
  } catch {}
}

export function stopSound(name: string) { safeStop(name) }

export default function AudioToggle() {
  const [muted, setMuted] = useState(true)

  const toggle = useCallback(async () => {
    if (muted) {
      setMuted(false)
      audioEnabled = true
      // Load Howler + create instances, then start music
      await ensureReady()
      safePlay('ambient', 0.08, 2500)
      setTimeout(() => safePlay('piano', 0.12, 3000), 1500)
    } else {
      audioEnabled = false
      setMuted(true)
      // Fade everything out then stop
      const all = Object.values(howls).filter(Boolean)
      all.forEach((h: any) => { try { h.fade(h.volume(), 0, 600) } catch {} })
      setTimeout(() => all.forEach((h: any) => { try { h.stop() } catch {} }), 700)
    }
  }, [muted])

  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      title={muted ? 'Enable sound' : 'Mute sound'}
      className="fixed top-4 right-4 z-50 w-9 h-9 flex items-center justify-center
                 rounded-full bg-black/40 backdrop-blur-sm border border-white/10
                 text-white/60 hover:text-white/90 transition-colors"
    >
      {muted ? (
        // Moon icon (muted)
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Speaker icon (unmuted)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </motion.button>
  )
}
