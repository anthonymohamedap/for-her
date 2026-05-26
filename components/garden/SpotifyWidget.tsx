'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  startLogin, loadTokens, clearTokens,
  getNowPlaying, PLAYLIST_URL, type NowPlaying,
} from '@/lib/spotify'
import { pauseGardenMusic, resumeGardenMusic } from '@/components/ui/AudioToggle'

const POLL_MS = 12_000

export default function SpotifyWidget() {
  const [connected, setConnected]     = useState(false)
  const [nowPlaying, setNowPlaying]   = useState<NowPlaying | null>(null)
  const [loading, setLoading]         = useState(true)
  const [minimized, setMinimized]     = useState(false)
  const [expanded, setExpanded]       = useState(false)   // mobile expand
  const [songPulse, setSongPulse]     = useState(false)
  const wasPlayingRef = useRef(false)
  const prevTitleRef  = useRef('')
  const pollRef       = useRef<ReturnType<typeof setInterval>>()

  const disconnect = useCallback(() => { clearTokens(); setConnected(false) }, [])

  useEffect(() => { setConnected(!!loadTokens()); setLoading(false) }, [])

  const poll = useCallback(async () => {
    const result = await getNowPlaying()
    if (!result) return
    // Song-changed pulse
    if (result.title && result.title !== prevTitleRef.current) {
      prevTitleRef.current = result.title
      setSongPulse(true)
      setTimeout(() => setSongPulse(false), 1200)
    }
    setNowPlaying(result)
    if (result.isPlaying && !wasPlayingRef.current) {
      pauseGardenMusic(); wasPlayingRef.current = true
    } else if (!result.isPlaying && wasPlayingRef.current) {
      resumeGardenMusic(); wasPlayingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!connected) {
      clearInterval(pollRef.current)
      if (wasPlayingRef.current) { resumeGardenMusic(); wasPlayingRef.current = false }
      setNowPlaying(null)
      return
    }
    poll()
    pollRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [connected, poll])

  if (loading) return null

  const isPlaying = nowPlaying?.isPlaying ?? false
  const progress  = nowPlaying && nowPlaying.durationMs > 0
    ? nowPlaying.progressMs / nowPlaying.durationMs : 0

  // ── Album art circle (shared between states) ─────────────────────────────
  const AlbumArt = ({ size }: { size: number }) => (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Glow ring */}
      <div style={{
        position: 'absolute', inset: -6,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(240,100,180,0.25) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <motion.div
        animate={{ rotate: isPlaying ? 360 : 0 }}
        transition={ isPlaying
          ? { duration: 12, repeat: Infinity, ease: 'linear' }
          : { duration: 0.8, ease: 'easeOut' }
        }
        style={{
          width: size, height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid rgba(200,130,255,0.3)',
          boxShadow: isPlaying
            ? '0 0 20px rgba(240,100,180,0.35), 0 0 40px rgba(168,85,247,0.2)'
            : '0 0 10px rgba(168,85,247,0.12)',
          position: 'relative',
          background: '#1a0a2e',
        }}
      >
        {nowPlaying?.albumArt ? (
          <Image src={nowPlaying.albumArt} alt="album" fill className="object-cover" sizes={`${size}px`} unoptimized />
        ) : (
          // Vinyl grooves when no art
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'repeating-radial-gradient(circle, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: size * 0.12, height: size * 0.12, borderRadius: '50%', background: 'rgba(200,130,255,0.4)' }} />
          </div>
        )}
      </motion.div>
    </div>
  )

  // ── Not connected — tiny connect prompt ──────────────────────────────────
  if (!connected) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 5, duration: 1.5 }}
        style={{
          position: 'fixed',
          bottom: '14vh', right: '3vw',
          zIndex: 10,
        }}
      >
        <motion.button
          onClick={startLogin}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          style={{
            background: 'rgba(15,5,30,0.55)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(200,130,255,0.15)',
            borderRadius: 20,
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'pointer',
            boxShadow: '0 0 30px rgba(168,85,247,0.12)',
          }}
        >
          <SpotifyLogo size={14} />
          <span style={{
            fontFamily: "'Caveat', cursive",
            fontSize: 13, color: 'rgba(200,150,255,0.7)',
            letterSpacing: '0.05em',
          }}>
            connect spotify
          </span>
        </motion.button>
      </motion.div>
    )
  }

  // ── MOBILE layout (bottom-center, collapsible row) ───────────────────────
  const MobilePlayer = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 4, duration: 1.2, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        bottom: 16, left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100vw - 40px)',
        maxWidth: 320,
        zIndex: 20,
        background: 'rgba(15,5,30,0.6)',
        backdropFilter: 'blur(16px) saturate(1.4)',
        border: '1px solid rgba(200,130,255,0.15)',
        borderRadius: 20,
        boxShadow: '0 0 30px rgba(168,85,247,0.12), 0 0 60px rgba(168,85,247,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* Collapsed row — always visible */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center',
          gap: 12, padding: '12px 16px',
          cursor: 'pointer',
        }}
      >
        <AlbumArt size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 13, color: 'rgba(255,240,255,0.9)',
            margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {isPlaying ? nowPlaying!.title : 'nothing playing…'}
          </p>
          {isPlaying && (
            <p style={{
              fontFamily: "'Caveat', cursive",
              fontSize: 11, color: 'rgba(200,150,255,0.6)',
              fontStyle: 'italic', margin: 0,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {nowPlaying!.artist}
            </p>
          )}
        </div>
        <PlayPauseIcon playing={isPlaying} size={28} />
      </div>

      {/* Expanded section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 14px' }}>
              <ProgressBar progress={progress} />
              {PLAYLIST_URL && <PlaylistLink href={PLAYLIST_URL} />}
              <button
                onClick={e => { e.stopPropagation(); disconnect() }}
                style={{
                  display: 'block', margin: '8px auto 0',
                  background: 'none', border: 'none',
                  fontSize: 9, color: 'rgba(200,130,255,0.3)',
                  cursor: 'pointer', letterSpacing: '0.05em',
                  fontFamily: "'Courier New', monospace",
                }}
              >
                disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )

  // ── DESKTOP layout (bottom-right, minimizable to disc) ───────────────────
  const DesktopPlayer = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 4, duration: 1.2, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        bottom: '14vh', right: '3vw',
        zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}
    >
      {/* Ambient glow behind player */}
      <motion.div
        animate={songPulse
          ? { scale: [1, 1.4, 1], opacity: [0.08, 0.22, 0.08] }
          : { scale: 1, opacity: 0.08 }
        }
        transition={{ duration: 1.2 }}
        style={{
          position: 'absolute', inset: -40,
          background: 'radial-gradient(ellipse, rgba(168,85,247,0.18) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      <AnimatePresence mode="wait">
        {minimized ? (
          // ── Minimized: just the spinning disc ──
          <motion.div
            key="mini"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.4 }}
            onClick={() => setMinimized(false)}
            style={{ cursor: 'pointer' }}
            title="Expand player"
          >
            <AlbumArt size={72} />
          </motion.div>
        ) : (
          // ── Full player card ──
          <motion.div
            key="full"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.4 }}
            style={{
              width: 200,
              background: 'rgba(15,5,30,0.55)',
              backdropFilter: 'blur(16px) saturate(1.4)',
              border: '1px solid rgba(200,130,255,0.15)',
              borderRadius: 20,
              boxShadow: '0 0 30px rgba(168,85,247,0.12), 0 0 60px rgba(168,85,247,0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
              padding: 16,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 10,
              position: 'relative',
            }}
          >
            {/* Minimise chevron */}
            <button
              onClick={() => setMinimized(true)}
              style={{
                position: 'absolute', top: 8, right: 10,
                background: 'none', border: 'none',
                color: 'rgba(200,130,255,0.3)',
                cursor: 'pointer', fontSize: 10, lineHeight: 1,
                padding: 4,
              }}
              title="Minimise"
            >
              ▾
            </button>

            <AlbumArt size={110} />

            {/* Track info */}
            <div style={{ width: '100%', textAlign: 'center' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={nowPlaying?.title ?? 'idle'}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.4 }}
                >
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 13, color: 'rgba(255,240,255,0.9)',
                    margin: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {isPlaying ? nowPlaying!.title : 'nothing playing…'}
                  </p>
                  {isPlaying && (
                    <p style={{
                      fontFamily: "'Caveat', cursive",
                      fontSize: 11, color: 'rgba(200,150,255,0.6)',
                      fontStyle: 'italic', margin: '2px 0 0',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {nowPlaying!.artist}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              <CtrlBtn><PrevIcon /></CtrlBtn>
              <CtrlBtn large><PlayPauseIcon playing={isPlaying} size={36} /></CtrlBtn>
              <CtrlBtn><NextIcon /></CtrlBtn>
            </div>

            {/* Progress bar */}
            <ProgressBar progress={progress} />

            {/* Playlist link */}
            {PLAYLIST_URL && <PlaylistLink href={PLAYLIST_URL} />}

            {/* Disconnect */}
            <button
              onClick={disconnect}
              style={{
                background: 'none', border: 'none',
                fontSize: 9, color: 'rgba(200,130,255,0.25)',
                cursor: 'pointer', letterSpacing: '0.05em',
                fontFamily: "'Courier New', monospace",
                marginTop: -4,
              }}
            >
              disconnect
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )

  return (
    <>
      <div className="hidden md:block"><DesktopPlayer /></div>
      <div className="md:hidden"><MobilePlayer /></div>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div style={{ width: '100%', position: 'relative', height: 12, display: 'flex', alignItems: 'center' }}>
      <div style={{
        width: '100%', height: 2,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
      }}>
        <div style={{
          width: `${progress * 100}%`, height: '100%',
          background: 'linear-gradient(90deg, #c084fc, #f472b6)',
          borderRadius: 2,
          boxShadow: '0 0 6px rgba(240,100,180,0.6)',
          transition: 'width 2s linear',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)',
            width: 8, height: 8, borderRadius: '50%',
            background: '#f9a8d4',
            boxShadow: '0 0 8px rgba(249,168,212,0.8)',
          }} />
        </div>
      </div>
    </div>
  )
}

function PlaylistLink({ href }: { href: string }) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      style={{
        fontFamily: "'Caveat', cursive",
        fontSize: 11, color: 'rgba(200,150,255,0.5)',
        textAlign: 'center', letterSpacing: '0.05em',
        textDecoration: 'none', display: 'block',
        transition: 'color 0.3s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(249,168,212,0.8)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(200,150,255,0.5)')}
    >
      ♪ our playlist ♪
    </a>
  )
}

function CtrlBtn({ children, large }: { children: React.ReactNode; large?: boolean }) {
  return (
    <button style={{
      background: large ? 'rgba(168,85,247,0.2)' : 'none',
      border: large ? '1px solid rgba(200,130,255,0.25)' : 'none',
      borderRadius: '50%',
      color: 'rgba(220,180,255,0.7)',
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: large ? 0 : 4,
      transition: 'color 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.color = 'rgba(249,168,212,1)'; e.currentTarget.style.transform = 'scale(1.15)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(220,180,255,0.7)'; e.currentTarget.style.transform = 'scale(1)' }}
    >
      {children}
    </button>
  )
}

function PlayPauseIcon({ playing, size }: { playing: boolean; size: number }) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {playing ? (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size * 0.45, height: size * 0.45 }}>
          <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size * 0.45, height: size * 0.45 }}>
          <polygon points="5,3 19,12 5,21" />
        </svg>
      )}
    </div>
  )
}

function PrevIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
      <polygon points="19,20 9,12 19,4" /><rect x="5" y="4" width="3" height="16" />
    </svg>
  )
}

function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
      <polygon points="5,4 15,12 5,20" /><rect x="16" y="4" width="3" height="16" />
    </svg>
  )
}

function SpotifyLogo({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="rgba(200,150,255,0.6)" style={{ width: size, height: size, flexShrink: 0 }}>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}
