'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  startLogin, loadTokens, clearTokens,
  getNowPlaying, PLAYLIST_URL, type NowPlaying,
  spotifyPlay, spotifyPause, spotifyNext, spotifyPrev, spotifySeek,
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

// ── Icon helpers ───────────────────────────────────────────────────────────────
function PlayPauseIcon({ playing, size = 16 }: { playing: boolean; size?: number }) {
  return playing ? (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size, height: size }}>
      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size, height: size }}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}
function PrevIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size, height: size }}>
      <polygon points="19,20 9,12 19,4" /><rect x="5" y="4" width="3" height="16" />
    </svg>
  )
}
function NextIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size, height: size }}>
      <polygon points="5,4 15,12 5,20" /><rect x="16" y="4" width="3" height="16" />
    </svg>
  )
}
function SpotifyDot() {
  return <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: '#1DB954', boxShadow: '0 0 6px #1DB954' }} />
}

// ── Session modal ──────────────────────────────────────────────────────────────
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
          transition: 'color 0.2s', padding: '4px 8px',
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
              position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(8,2,18,0.97)', border: '1px solid rgba(200,130,255,0.2)',
              borderRadius: 10, padding: '10px 14px', width: 200,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)', textAlign: 'center', zIndex: 200,
            }}
          >
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Connected via Spotify
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setOpen(false)} style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: 12, minHeight: 36 }}>
                keep listening
              </button>
              <button onClick={onDisconnect} style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(200,130,255,0.2)', color: 'rgba(200,130,255,0.8)', fontSize: 12, minHeight: 36 }}>
                disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Seekable progress bar ──────────────────────────────────────────────────────
function SeekBar({ progress, durationMs, onSeek }: { progress: number; durationMs: number; onSeek: (ms: number) => void }) {
  const barRef = useRef<HTMLDivElement>(null)

  function handleClick(e: React.MouseEvent) {
    if (!barRef.current || durationMs === 0) return
    const rect = barRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(pct * durationMs)
  }

  return (
    <div
      ref={barRef}
      onClick={handleClick}
      style={{ width: '100%', height: 20, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
    >
      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4, position: 'relative' }}>
        <div style={{
          width: `${progress * 100}%`, height: '100%',
          background: 'linear-gradient(90deg,#c084fc,#f472b6)', borderRadius: 4,
          boxShadow: '0 0 8px rgba(240,100,180,0.5)',
          transition: 'width 2s linear', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)',
            width: 12, height: 12, borderRadius: '50%',
            background: '#f9a8d4', boxShadow: '0 0 10px rgba(249,168,212,0.9)',
          }} />
        </div>
      </div>
    </div>
  )
}

// ── Mini player (collapsed bar state) ────────────────────────────────────────
function MiniPlayer() {
  const [connected, setConnected]   = useState(false)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState(false)
  const [songPulse, setSongPulse]   = useState(false)
  const [actionPending, setActionPending] = useState(false)
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

  // Playback control with optimistic UI + re-poll after action
  async function handleControl(action: () => Promise<boolean>) {
    if (actionPending) return
    setActionPending(true)
    // Optimistic update
    const playing = nowPlaying?.isPlaying ?? false
    if (nowPlaying) setNowPlaying({ ...nowPlaying, isPlaying: !playing })
    await action()
    setTimeout(() => { poll(); setActionPending(false) }, 600)
  }

  async function handleNext() {
    if (actionPending) return
    setActionPending(true)
    await spotifyNext()
    setTimeout(() => { poll(); setActionPending(false) }, 800)
  }

  async function handlePrev() {
    if (actionPending) return
    setActionPending(true)
    await spotifyPrev()
    setTimeout(() => { poll(); setActionPending(false) }, 800)
  }

  async function handleSeek(ms: number) {
    if (!nowPlaying) return
    setNowPlaying({ ...nowPlaying, progressMs: ms })
    await spotifySeek(ms)
    setTimeout(poll, 1000)
  }

  if (loading) return null

  const isPlaying = nowPlaying?.isPlaying ?? false
  const progress  = nowPlaying && nowPlaying.durationMs > 0
    ? nowPlaying.progressMs / nowPlaying.durationMs : 0

  if (!connected) {
    return (
      <button
        onClick={startLogin}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(200,130,255,0.08)', border: '1px solid rgba(200,130,255,0.2)',
          borderRadius: 20, padding: '5px 12px', cursor: 'pointer',
          color: 'rgba(200,150,255,0.7)', fontFamily: "'Caveat', cursive",
          fontSize: 13, letterSpacing: '0.04em',
        }}
      >
        <SpotifyDot />
        connect spotify
      </button>
    )
  }

  // Ctrl button helper
  function CtrlBtn({ onClick, children, large }: { onClick: () => void; children: React.ReactNode; large?: boolean }) {
    return (
      <button
        onClick={onClick}
        disabled={actionPending}
        style={{
          width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: large ? 'rgba(168,85,247,0.2)' : 'none',
          border: large ? '1px solid rgba(200,130,255,0.3)' : 'none',
          borderRadius: '50%', cursor: actionPending ? 'default' : 'pointer',
          color: actionPending ? 'rgba(220,180,255,0.35)' : 'rgba(220,180,255,0.85)',
          transition: 'all 0.2s', flexShrink: 0,
        }}
        onMouseEnter={e => { if (!actionPending) { e.currentTarget.style.color = '#f9a8d4'; e.currentTarget.style.transform = 'scale(1.12)' } }}
        onMouseLeave={e => { e.currentTarget.style.color = actionPending ? 'rgba(220,180,255,0.35)' : 'rgba(220,180,255,0.85)'; e.currentTarget.style.transform = 'scale(1)' }}
      >
        {children}
      </button>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Collapsed mini-player row ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 8px 4px 4px', borderRadius: 12, transition: 'background 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <motion.div
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={isPlaying ? { duration: 12, repeat: Infinity, ease: 'linear' } : { duration: 0.8, ease: 'easeOut' }}
          style={{
            width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
            border: `1px solid ${isPlaying ? 'rgba(240,100,180,0.5)' : 'rgba(200,130,255,0.25)'}`,
            background: '#1a0a2e', flexShrink: 0, position: 'relative',
            boxShadow: isPlaying ? '0 0 10px rgba(240,100,180,0.3)' : 'none',
          }}
        >
          {nowPlaying?.albumArt
            ? <Image src={nowPlaying.albumArt} alt="album" fill className="object-cover" sizes="32px" unoptimized />
            : <div style={{ position: 'absolute', inset: 0, background: 'repeating-radial-gradient(circle, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(200,130,255,0.5)' }} /></div>
          }
        </motion.div>
        <div style={{ maxWidth: 140, textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
            {isPlaying ? nowPlaying!.title : 'nothing playing'}
          </p>
          {isPlaying && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
              {nowPlaying!.artist}
            </p>
          )}
        </div>
        <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: isPlaying ? '#1DB954' : 'rgba(255,255,255,0.2)', boxShadow: isPlaying ? '0 0 6px #1DB954' : 'none', transition: 'all 0.4s' }} />
      </button>

      {/* ── Full side panel — no scroll, everything always visible ── */}
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
              width: 300,
              bottom: 0,
              zIndex: 90,
              background: 'rgba(6,2,18,0.96)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderRight: '1px solid rgba(200,130,255,0.14)',
              boxShadow: '4px 0 40px rgba(0,0,0,0.5)',
              // Flex column — no scroll, content fills the height
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setExpanded(false)}
              style={{
                position: 'absolute', top: 12, right: 12,
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '50%', cursor: 'pointer', color: 'rgba(200,130,255,0.5)',
                fontSize: 14, zIndex: 10, transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(200,130,255,0.5)' }}
            >✕</button>

            {/* Song-change pulse glow */}
            <motion.div
              animate={songPulse ? { scale: [1, 1.6, 1], opacity: [0, 0.18, 0] } : { scale: 1, opacity: 0 }}
              transition={{ duration: 1.2 }}
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
                background: 'radial-gradient(ellipse at center 30%, rgba(168,85,247,0.25) 0%, transparent 65%)',
              }}
            />

            {/* ── Album art — fills upper portion ── */}
            <div style={{
              flex: '0 0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingTop: 52, paddingBottom: 12,
              position: 'relative', zIndex: 1,
            }}>
              <motion.div
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={isPlaying ? { duration: 12, repeat: Infinity, ease: 'linear' } : { duration: 0.8, ease: 'easeOut' }}
                style={{
                  width: 160, height: 160, borderRadius: '50%', overflow: 'hidden',
                  border: '2px solid rgba(200,130,255,0.35)',
                  background: '#1a0a2e', position: 'relative',
                  boxShadow: isPlaying
                    ? '0 0 30px rgba(240,100,180,0.45), 0 0 60px rgba(168,85,247,0.2)'
                    : '0 0 12px rgba(168,85,247,0.15)',
                }}
              >
                {nowPlaying?.albumArt
                  ? <Image src={nowPlaying.albumArt} alt="album" fill className="object-cover" sizes="160px" unoptimized />
                  : <div style={{ position: 'absolute', inset: 0, background: 'repeating-radial-gradient(circle, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(200,130,255,0.5)' }} /></div>
                }
              </motion.div>
            </div>

            {/* ── Track + artist ── */}
            <div style={{ flex: '0 0 auto', padding: '0 24px 8px', textAlign: 'center', zIndex: 1 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={nowPlaying?.title ?? 'idle'}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.3 }}>
                    {isPlaying ? nowPlaying!.title : 'nothing playing…'}
                  </p>
                  {isPlaying && (
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', fontFamily: "'Caveat', cursive", fontStyle: 'italic' }}>
                      {nowPlaying!.artist}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Seek bar ── */}
            <div style={{ flex: '0 0 auto', padding: '4px 24px 8px', zIndex: 1 }}>
              <SeekBar
                progress={progress}
                durationMs={nowPlaying?.durationMs ?? 0}
                onSeek={handleSeek}
              />
            </div>

            {/* ── Controls ── */}
            <div style={{
              flex: '0 0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '0 24px 16px', zIndex: 1,
            }}>
              <CtrlBtn onClick={handlePrev}><PrevIcon size={18} /></CtrlBtn>
              <CtrlBtn onClick={() => handleControl(isPlaying ? spotifyPause : spotifyPlay)} large>
                <PlayPauseIcon playing={isPlaying} size={22} />
              </CtrlBtn>
              <CtrlBtn onClick={handleNext}><NextIcon size={18} /></CtrlBtn>
            </div>

            {/* ── Playlist link ── */}
            {PLAYLIST_URL && (
              <div style={{ flex: '0 0 auto', padding: '0 24px 12px', textAlign: 'center', zIndex: 1 }}>
                <a
                  href={PLAYLIST_URL} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "'Caveat', cursive", fontSize: 14, color: 'rgba(200,150,255,0.6)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(249,168,212,0.9)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(200,150,255,0.6)')}
                >
                  ♪ our playlist ♪
                </a>
              </div>
            )}

            {/* ── Spacer pushes session to bottom ── */}
            <div style={{ flex: 1 }} />

            {/* ── Session modal — pinned to bottom ── */}
            <div style={{ flex: '0 0 auto', padding: '12px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', zIndex: 1 }}>
              <SessionModal onDisconnect={() => { clearTokens(); setConnected(false); setExpanded(false) }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
      {/* LEFT — mini-player */}
      <div style={{ flex: '0 0 auto', minWidth: 220 }}>
        <MiniPlayer />
      </div>

      {/* CENTER — nav */}
      <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {[{ href: '/', label: '🌸 Garden' }, { href: '/today', label: '📷 Today' }].map(({ href, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} style={{
              fontFamily: "'Caveat', cursive", fontSize: 16, letterSpacing: '0.04em',
              padding: '6px 18px', borderRadius: 20, textDecoration: 'none',
              transition: 'all 0.25s',
              color: active ? 'var(--accent-pink)' : 'rgba(255,255,255,0.5)',
              background: active ? 'rgba(232,143,181,0.1)' : 'transparent',
              border: active ? '1px solid rgba(232,143,181,0.2)' : '1px solid transparent',
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
            >{label}</Link>
          )
        })}
      </nav>

      {/* RIGHT — moon */}
      <div style={{ flex: '0 0 auto', minWidth: 220, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%', background: 'rgba(192,132,252,0.07)',
          border: '1px solid rgba(192,132,252,0.12)', cursor: 'default',
        }}>
          <MoonIcon />
        </div>
      </div>
    </motion.header>
  )
}
