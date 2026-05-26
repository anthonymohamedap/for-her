'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  startLogin,
  loadTokens,
  clearTokens,
  getNowPlaying,
  PLAYLIST_URL,
  type NowPlaying,
} from '@/lib/spotify'
import { pauseGardenMusic, resumeGardenMusic } from '@/components/ui/AudioToggle'

const POLL_MS = 12_000

export default function SpotifyWidget() {
  const [connected, setConnected] = useState(false)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [loading, setLoading] = useState(true)
  const wasPlayingRef = useRef(false)
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  // Check if we have tokens on mount
  useEffect(() => {
    const tokens = loadTokens()
    setConnected(!!tokens)
    setLoading(false)
  }, [])

  const poll = useCallback(async () => {
    const result = await getNowPlaying()
    if (!result) return

    setNowPlaying(result)

    // Pause/resume garden music based on Spotify playback
    if (result.isPlaying && !wasPlayingRef.current) {
      pauseGardenMusic()
      wasPlayingRef.current = true
    } else if (!result.isPlaying && wasPlayingRef.current) {
      resumeGardenMusic()
      wasPlayingRef.current = false
    }
  }, [])

  // Start polling when connected
  useEffect(() => {
    if (!connected) {
      clearInterval(pollRef.current)
      // Resume garden music when disconnected
      if (wasPlayingRef.current) {
        resumeGardenMusic()
        wasPlayingRef.current = false
      }
      setNowPlaying(null)
      return
    }

    poll()
    pollRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [connected, poll])

  function handleConnect() {
    startLogin()
  }

  function handleDisconnect() {
    clearTokens()
    setConnected(false)
  }

  if (loading) return null

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <motion.button
        onClick={handleConnect}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 4, duration: 1.5 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50
                   flex items-center gap-2 px-4 py-2 rounded-full
                   bg-black/40 backdrop-blur-sm border border-white/10
                   text-white/50 hover:text-white/80 text-xs transition-colors"
        title="Connect Spotify"
      >
        <SpotifyIcon className="w-3.5 h-3.5 opacity-70" />
        <span className="font-caveat text-sm tracking-wide">connect spotify</span>
      </motion.button>
    )
  }

  const playing = nowPlaying?.isPlaying

  // ── Connected — Now Playing card ───────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 3.8, duration: 1.4, ease: 'easeOut' }}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50
                 flex flex-col items-center gap-2"
    >
      {/* Now Playing card — only visible when something plays */}
      <AnimatePresence>
        {playing && nowPlaying && (
          <motion.div
            key="now-playing"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="flex items-center gap-3 px-3 py-2 rounded-2xl
                       bg-black/45 backdrop-blur-md border border-white/10
                       max-w-[240px] md:max-w-[300px]"
          >
            {/* Album art */}
            {nowPlaying.albumArt && (
              <div className="relative flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden">
                <Image
                  src={nowPlaying.albumArt}
                  alt="album art"
                  fill
                  className="object-cover"
                  sizes="36px"
                  unoptimized
                />
              </div>
            )}

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-xs font-medium truncate leading-tight">
                {nowPlaying.title}
              </p>
              <p className="text-white/40 text-xs truncate leading-tight mt-0.5">
                {nowPlaying.artist}
              </p>
            </div>

            {/* Spotify icon + playing indicator */}
            <div className="flex-shrink-0 flex items-center gap-1.5">
              <EqualizerBars />
              <SpotifyIcon className="w-3 h-3 text-[#1DB954]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom row: playlist button + disconnect */}
      <div className="flex items-center gap-3">
        {/* Our playlist */}
        {PLAYLIST_URL && (
          <motion.a
            href={PLAYLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full
                       bg-black/40 backdrop-blur-sm border border-white/10
                       text-white/50 hover:text-white/80 transition-colors"
          >
            <SpotifyIcon className="w-3 h-3 opacity-70" />
            <span className="font-caveat text-sm tracking-wide">our playlist</span>
          </motion.a>
        )}

        {/* Disconnect */}
        <motion.button
          onClick={handleDisconnect}
          whileHover={{ scale: 1.1, opacity: 1 }}
          className="w-6 h-6 flex items-center justify-center rounded-full
                     bg-black/30 border border-white/10 text-white/25
                     hover:text-white/50 transition-colors"
          title="Disconnect Spotify"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Tiny Spotify logo SVG ──────────────────────────────────────────────────────
function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}

// ── Animated equalizer bars (playing indicator) ──────────────────────────────
function EqualizerBars() {
  return (
    <div className="flex items-end gap-px h-3">
      {[0.4, 0.8, 0.5, 1.0, 0.6].map((delay, i) => (
        <motion.div
          key={i}
          className="w-px bg-[#1DB954] rounded-full"
          animate={{ height: ['40%', '100%', '55%', '85%', '40%'] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: delay * 0.4,
          }}
          style={{ minHeight: 2 }}
        />
      ))}
    </div>
  )
}
