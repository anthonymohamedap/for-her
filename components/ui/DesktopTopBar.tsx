'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  startLogin, loadTokens, clearTokens,
  getNowPlaying, PLAYLIST_URL, type NowPlaying,
} from '@/lib/spotify'
import { pauseGardenMusic, resumeGardenMusic } from '@/components/ui/AudioToggle'

const POLL_MS = 12_000

// ── Moon SVG ──────────────────────────────────────────────────────────────────
function MoonIcon() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" fill="none">
      <defs>
        <radialGradient id="tbMoonGrad" cx="40%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#fff8f0" />
          <stop offset="55%" stopColor="#e8d5f5" />
          <stop offset="100%" stopColor="#c084fc" />
        </radialGradient>
        <filter id="tbMoonGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx="16" cy="16" r="13" fill="url(#tbMoonGrad)" filter="url(#tbMoonGlow)" opacity="0.9" />
      <circle cx="10" cy="11" r="4" fill="#c084fc" opacity="0.18" />
      <circle cx="19" cy="20" r="2.5" fill="#a855f7" opacity="0.12" />
    </svg>
  )
}

// ── Spotify mini-player inside the bar ────────────────────────────────────────
function MiniPlayer() {
  const [connected, setConnected]   = useState(false)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState(false)
  const [songPulse, setSongPulse]   = useState(false)
  const wasPlayingRef = useRef(false)
  const prevTitleRef  = useRef('')
  const pollRef       = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => { setConnected(!!loadTokens()); setLoading(false) }, [])

  const poll = useCallback(async () => {
    const result = await getNowPlaying()
    if (!result) return
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

  const isPlaying  = nowPlaying?.isPlaying ?? false
  const progress   = nowPlaying && nowPlaying.durationMs > 0
    ? nowPlaying.progressMs / nowPlaying.durationMs : 0

  if (!connected) {
    return (
      <button
        onClick={startLogin}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(200,130,255,0.08)',
          border: '1px solid rgba(200,130,255,0.2)',
          borderRadius: 20, padding: '5px 12px',
          cursor: 'pointer', color: 'rgba(200,150,255,0.7)',
          fontFamily: "'Caveat', cursive", fontSize: 13, letterSpacing: '0.04em',
        }}
      >
        <SpotifyDot />
        connect spotify
      </button>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Collapsed row — always visible in bar */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 4px',
          borderRadius: 12,
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        {/* 32px spinning disc */}
        <motion.div
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={isPlaying
            ? { duration: 12, repeat: Infinity, ease: 'linear' }
            : { duration: 0.8, ease: 'easeOut' }}
          style={{
            width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
            border: `1px solid ${isPlaying ? 'rgba(240,100,180,0.5)' : 'rgba(200,130,255,0.25)'}`,
            background: '#1a0a2e', flexShrink: 0, position: 'relative',
            boxShadow: isPlaying ? '0 0 10px rgba(240,100,180,0.3)' : 'none',
          }}
        >
          {nowPlaying?.albumArt ? (
            <Image src={nowPlaying.albumArt} alt="album" fill className="object-cover" sizes="32px" unoptimized />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'repeating-radial-gradient(circle, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(200,130,255,0.5)' }} />
            </div>
          )}
        </motion.div>

        {/* Track + artist */}
        <div style={{ maxWidth: 140, textAlign: 'left' }}>
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            lineHeight: 1.3,
          }}>
            {isPlaying ? nowPlaying!.title : (connected ? 'nothing playing' : '')}
          </p>
          {isPlaying && (
            <p style={{
              margin: 0, fontSize: 12,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              lineHeight: 1.2,
            }}>
              {nowPlaying!.artist}
            </p>
          )}
        </div>

        {/* Play/pause indicator dot */}
        <div style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: isPlaying ? '#1DB954' : 'rgba(255,255,255,0.2)',
          boxShadow: isPlaying ? '0 0 6px #1DB954' : 'none',
          transition: 'all 0.4s',
        }} />
      </button>

      {/* Side panel — slides in from left, full viewport height */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ x: -340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -340, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            style={{
              position: 'fixed',
              top: 'var(--bar-height-desktop)',
              left: 0,
              width: 320,
              bottom: 0,
              zIndex: 90,
              background: 'rgba(6,2,18,0.94)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderRight: '1px solid rgba(200,130,255,0.14)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              overflowY: 'auto',
              boxShadow: '4px 0 40px rgba(0,0,0,0.4)',
            }}
          >
            {/* Close panel button */}
            <button
              onClick={() => setExpanded(false)}
              style={{
                position: 'absolute', top: 12, right: 12,
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '50%', cursor: 'pointer',
                color: 'rgba(200,130,255,0.5)',
                fontSize: 14, lineHeight: 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(200,130,255,0.5)' }}
              title="Close"
            >
              ✕
            </button>

          {/* Song pulse glow */}
            <motion.div
              animate={songPulse
                ? { scale: [1, 1.4, 1], opacity: [0, 0.2, 0] }
                : { scale: 1, opacity: 0 }}
              transition={{ duration: 1.2 }}
              style={{
                position: 'absolute', inset: -20, borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(168,85,247,0.3) 0%, transparent 70%)',
                pointerEvents: 'none', zIndex: -1,
              }}
            />

            {/* Album art */}
            <motion.div
              animate={{ rotate: isPlaying ? 360 : 0 }}
              transition={isPlaying
                ? { duration: 12, repeat: Infinity, ease: 'linear' }
                : { duration: 0.8, ease: 'easeOut' }}
              style={{
                width: 100, height: 100, borderRadius: '50%', overflow: 'hidden',
                margin: '0 auto 12px',
                border: '2px solid rgba(200,130,255,0.3)',
                background: '#1a0a2e', position: 'relative',
                boxShadow: isPlaying
                  ? '0 0 20px rgba(240,100,180,0.4), 0 0 40px rgba(168,85,247,0.2)'
                  : '0 0 10px rgba(168,85,247,0.15)',
              }}
            >
              {nowPlaying?.albumArt ? (
                <Image src={nowPlaying.albumArt} alt="album" fill className="object-cover" sizes="100px" unoptimized />
              ) : (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'repeating-radial-gradient(circle, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(200,130,255,0.5)' }} />
                </div>
              )}
            </motion.div>

            {/* Track info */}
            <AnimatePresence mode="wait">
              <motion.div
                key={nowPlaying?.title ?? 'idle'}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                style={{ textAlign: 'center', marginBottom: 10 }}
              >
                <p style={{
                  margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
                  fontFamily: "'Cormorant Garamond', serif",
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {isPlaying ? nowPlaying!.title : 'nothing playing…'}
                </p>
                {isPlaying && (
                  <p style={{
                    margin: '3px 0 0', fontSize: 13,
                    color: 'var(--text-secondary)',
                    fontFamily: "'Caveat', cursive", fontStyle: 'italic',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {nowPlaying!.artist}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Progress bar — 4px visual, 20px touch zone */}
            <div style={{ width: '100%', height: 20, display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4, position: 'relative' }}>
                <div style={{
                  width: `${progress * 100}%`, height: '100%',
                  background: 'linear-gradient(90deg,#c084fc,#f472b6)', borderRadius: 4,
                  boxShadow: '0 0 8px rgba(240,100,180,0.5)',
                  transition: 'width 2s linear', position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)',
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#f9a8d4', boxShadow: '0 0 8px rgba(249,168,212,0.8)',
                  }} />
                </div>
              </div>
            </div>

            {/* Controls — 44px touch targets */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'prev', icon: <PrevIcon /> },
                { label: 'playpause', icon: <PlayPauseIcon playing={isPlaying} />, large: true },
                { label: 'next', icon: <NextIcon /> },
              ].map(btn => (
                <button
                  key={btn.label}
                  style={{
                    width: 44, height: 44,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: btn.large ? 'rgba(168,85,247,0.2)' : 'none',
                    border: btn.large ? '1px solid rgba(200,130,255,0.3)' : 'none',
                    borderRadius: '50%', cursor: 'pointer',
                    color: 'rgba(220,180,255,0.8)', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f9a8d4'; e.currentTarget.style.transform = 'scale(1.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(220,180,255,0.8)'; e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {btn.icon}
                </button>
              ))}
            </div>

            {/* Playlist + disconnect */}
            {PLAYLIST_URL && (
              <a href={PLAYLIST_URL} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'block', textAlign: 'center', marginBottom: 10,
                  fontFamily: "'Caveat', cursive", fontSize: 13,
                  color: 'rgba(200,150,255,0.6)', textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(249,168,212,0.9)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(200,150,255,0.6)')}
              >
                ♪ our playlist ♪
              </a>
            )}

            {/* Session settings — replaces bare "disconnect" */}
            <SessionModal onDisconnect={() => { clearTokens(); setConnected(false); setExpanded(false) }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Session modal — replaces bare "disconnect" ────────────────────────────────
function SessionModal({ onDisconnect }: { onDisconnect: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, color: 'var(--text-tertiary)',
          letterSpacing: '0.04em', fontFamily: "'Courier New', monospace",
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
      >
        ⚙ session
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(8,2,18,0.95)', border: '1px solid rgba(200,130,255,0.2)',
              borderRadius: 10, padding: '10px 14px', width: 200,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              textAlign: 'center', zIndex: 110,
            }}
          >
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Connected via Spotify
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-secondary)', fontSize: 12, minHeight: 36,
                }}
              >
                keep listening
              </button>
              <button
                onClick={onDisconnect}
                style={{
                  padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(200,130,255,0.2)',
                  color: 'rgba(200,130,255,0.8)', fontSize: 12, minHeight: 36,
                }}
              >
                disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Icon helpers ──────────────────────────────────────────────────────────────
function SpotifyDot() {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
      background: '#1DB954', boxShadow: '0 0 6px #1DB954',
    }} />
  )
}
function PlayPauseIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
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

// ── Main desktop bar ──────────────────────────────────────────────────────────
export default function DesktopTopBar() {
  const pathname = usePathname()

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
      className="hidden md:flex"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 'var(--bar-height-desktop)',
        zIndex: 50,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'rgba(5, 2, 15, 0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* LEFT — Spotify mini-player */}
      <div style={{ flex: '0 0 auto', minWidth: 200 }}>
        <MiniPlayer />
      </div>

      {/* CENTER — nav tabs */}
      <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {[
          { href: '/', label: '🌸 Garden' },
          { href: '/today', label: '📷 Today' },
        ].map(({ href, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: "'Caveat', cursive",
                fontSize: 16, letterSpacing: '0.04em',
                padding: '6px 18px', borderRadius: 20,
                textDecoration: 'none',
                transition: 'all 0.25s',
                color: active ? 'var(--accent-pink)' : 'rgba(255,255,255,0.5)',
                background: active ? 'rgba(232,143,181,0.1)' : 'transparent',
                border: active ? '1px solid rgba(232,143,181,0.2)' : '1px solid transparent',
              }}
              onMouseEnter={e => {
                if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
              }}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* RIGHT — moon icon */}
      <div style={{
        flex: '0 0 auto', minWidth: 200,
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
      }}>
        <div title="Our garden" style={{
          width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%',
          background: 'rgba(192,132,252,0.07)',
          border: '1px solid rgba(192,132,252,0.12)',
          transition: 'background 0.2s',
          cursor: 'default',
        }}>
          <MoonIcon />
        </div>
      </div>
    </motion.header>
  )
}
