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

// Shared glass card style
const GLASS: React.CSSProperties = {
  background: 'rgba(15,5,30,0.6)',
  backdropFilter: 'blur(20px) saturate(1.4)',
  border: '1px solid rgba(200,130,255,0.15)',
  boxShadow: '0 0 20px rgba(168,85,247,0.1), 0 4px 24px rgba(0,0,0,0.4)',
}

export default function SpotifyWidget() {
  const [connected, setConnected]   = useState(false)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState(false)
  const [songPulse, setSongPulse]   = useState(false)
  const wasPlayingRef = useRef(false)
  const prevTitleRef  = useRef('')
  const pollRef       = useRef<ReturnType<typeof setInterval>>()

  const disconnect = useCallback(() => { clearTokens(); setConnected(false) }, [])

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

  const isPlaying = nowPlaying?.isPlaying ?? false
  const progress  = nowPlaying && nowPlaying.durationMs > 0
    ? nowPlaying.progressMs / nowPlaying.durationMs : 0

  // Spring slide-in from above
  const springIn = {
    hidden:  { y: -80, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, damping: 20, stiffness: 200, delay: 2.5 } },
  }

  // ── Album art disc ──────────────────────────────────────────────────────
  const AlbumArt = ({ size }: { size: number }) => (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <motion.div
        animate={{ rotate: isPlaying ? 360 : 0 }}
        transition={isPlaying
          ? { duration: 12, repeat: Infinity, ease: 'linear' }
          : { duration: 0.8, ease: 'easeOut' }}
        style={{
          width: size, height: size, borderRadius: '50%', overflow: 'hidden',
          border: '2px solid rgba(200,130,255,0.3)',
          boxShadow: isPlaying
            ? '0 0 16px rgba(240,100,180,0.4), 0 0 32px rgba(168,85,247,0.2)'
            : '0 0 8px rgba(168,85,247,0.15)',
          background: '#1a0a2e', position: 'relative',
        }}
      >
        {nowPlaying?.albumArt ? (
          <Image src={nowPlaying.albumArt} alt="album" fill className="object-cover" sizes={`${size}px`} unoptimized />
        ) : (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'repeating-radial-gradient(circle, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: size * 0.14, height: size * 0.14, borderRadius: '50%', background: 'rgba(200,130,255,0.5)' }} />
          </div>
        )}
      </motion.div>
    </div>
  )

  // ── Not connected — tiny pill ─────────────────────────────────────────
  if (!connected) {
    return (
      <motion.div
        variants={springIn} initial="hidden" animate="visible"
        className="md:hidden"
        style={{ position: 'fixed', top: 16, left: 16, zIndex: 50 }}
      >
        <motion.button
          onClick={startLogin}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          style={{
            ...GLASS, borderRadius: 50,
            padding: '8px 16px 8px 10px',
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'pointer',
          }}
        >
          <SpotifyLogo size={14} />
          <span style={{ fontFamily: "'Caveat', cursive", fontSize: 13, color: 'rgba(200,150,255,0.7)', letterSpacing: '0.05em' }}>
            connect spotify
          </span>
        </motion.button>
      </motion.div>
    )
  }

  // ── Collapsed pill ───────────────────────────────────────────────────
  const CollapsedPill = () => (
    <div
      onClick={() => setExpanded(true)}
      style={{
        ...GLASS, borderRadius: 50,
        display: 'flex', alignItems: 'center',
        gap: 10, padding: '8px 14px 8px 8px',
        cursor: 'pointer',
      }}
    >
      <AlbumArt size={40} />
      <div style={{ flex: 1, minWidth: 0, maxWidth: 130 }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 12, color: 'rgba(255,240,255,0.9)',
          margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: 1.4,
        }}>
          {isPlaying ? nowPlaying!.title : 'nothing playing…'}
        </p>
        {isPlaying && (
          <p style={{
            fontFamily: "'Caveat', cursive",
            fontSize: 10, color: 'rgba(200,150,255,0.6)', fontStyle: 'italic',
            margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {nowPlaying!.artist}
          </p>
        )}
      </div>
      <PlayPauseIcon playing={isPlaying} size={26} />
    </div>
  )

  // ── Expanded card ────────────────────────────────────────────────────
  const ExpandedCard = () => (
    <div style={{
      ...GLASS, borderRadius: 20,
      padding: 16, width: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      position: 'relative',
    }}>
      {/* Ambient pulse on song change */}
      <motion.div
        animate={songPulse
          ? { scale: [1, 1.5, 1], opacity: [0.1, 0.25, 0.1] }
          : { scale: 1, opacity: 0.1 }}
        transition={{ duration: 1.2 }}
        style={{
          position: 'absolute', inset: -30,
          background: 'radial-gradient(ellipse, rgba(168,85,247,0.2) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none', zIndex: -1,
        }}
      />

      {/* Collapse button */}
      <button
        onClick={() => setExpanded(false)}
        style={{
          position: 'absolute', top: 8, right: 10,
          background: 'none', border: 'none',
          color: 'rgba(200,130,255,0.35)', cursor: 'pointer',
          fontSize: 11, lineHeight: 1, padding: 4,
        }}
        title="Collapse"
      >
        ▴
      </button>

      <AlbumArt size={110} />

      {/* Track info */}
      <div style={{ width: '100%', textAlign: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={nowPlaying?.title ?? 'idle'}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35 }}
          >
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 18, fontWeight: 600, color: 'var(--text-primary)',
              margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {isPlaying ? nowPlaying!.title : 'nothing playing…'}
            </p>
            {isPlaying && (
              <p style={{
                fontFamily: "'Caveat', cursive",
                fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic',
                margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
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

      {/* Progress */}
      <ProgressBar progress={progress} />

      {PLAYLIST_URL && <PlaylistLink href={PLAYLIST_URL} />}

      <MobileSessionModal onDisconnect={disconnect} />
    </div>
  )

  // On desktop the top bar handles the player — show this only on mobile
  return (
    <motion.div
      variants={springIn} initial="hidden" animate="visible"
      className="md:hidden"
      style={{
        position: 'fixed', top: 16, left: 16, zIndex: 50,
        width: 'calc(100vw - 32px)',
        maxWidth: 300,
      }}
    >
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.95, borderRadius: 50 }}
            animate={{ opacity: 1, scale: 1, borderRadius: 20 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <ExpandedCard />
          </motion.div>
        ) : (
          <motion.div
            key="pill"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <CollapsedPill />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function ProgressBar({ progress }: { progress: number }) {
  return (
    // 20px tall touch zone, 4px visual bar
    <div style={{ width: '100%', height: 20, display: 'flex', alignItems: 'center' }}>
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
  )
}

// ── Mobile session modal — replaces bare "disconnect" ────────────────────────
function MobileSessionModal({ onDisconnect }: { onDisconnect: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ textAlign: 'center', marginTop: -4, position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, color: 'var(--text-tertiary)',
          letterSpacing: '0.04em', fontFamily: "'Courier New', monospace",
          minHeight: 36, padding: '6px 12px',
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
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(8,2,18,0.97)',
              border: '1px solid rgba(200,130,255,0.2)',
              borderRadius: 12, padding: '12px 16px', width: 200,
              boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
              zIndex: 110,
            }}
          >
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Connected via Spotify
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-secondary)', fontSize: 12,
                  minHeight: 36,
                }}
              >
                keep
              </button>
              <button
                onClick={onDisconnect}
                style={{
                  padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(168,85,247,0.12)',
                  border: '1px solid rgba(200,130,255,0.2)',
                  color: 'rgba(200,130,255,0.8)', fontSize: 12,
                  minHeight: 36,
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


function PlaylistLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{
        fontFamily: "'Caveat', cursive", fontSize: 11,
        color: 'rgba(200,150,255,0.5)', textAlign: 'center',
        letterSpacing: '0.05em', textDecoration: 'none', display: 'block',
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
      width: 44, height: 44,
      background: large ? 'rgba(168,85,247,0.2)' : 'none',
      border: large ? '1px solid rgba(200,130,255,0.25)' : 'none',
      borderRadius: '50%', color: 'rgba(220,180,255,0.7)',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size * 0.42, height: size * 0.42 }}>
          <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size * 0.42, height: size * 0.42 }}>
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
    <svg viewBox="0 0 24 24" fill="rgba(200,150,255,0.7)" style={{ width: size, height: size, flexShrink: 0 }}>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}
