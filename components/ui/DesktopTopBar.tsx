'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  loadTokens, startLogin, getNowPlaying, type NowPlaying,
  spotifyPlay, spotifyPause,
} from '@/lib/spotify'
import { pauseGardenMusic, resumeGardenMusic } from '@/components/ui/AudioToggle'
import { setPanelOpen, subscribePanelOpen, getPanelOpen } from '@/lib/panelStore'

const POLL_MS = 12_000

function MoonIcon() {
  return (
    <svg viewBox="0 0 32 32" width="20" height="20" fill="none">
      <defs>
        <radialGradient id="tbMG" cx="40%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#fff8f0" />
          <stop offset="55%" stopColor="#e8d5f5" />
          <stop offset="100%" stopColor="#c084fc" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="13" fill="url(#tbMG)" opacity="0.9" />
      <circle cx="10" cy="11" r="4" fill="#c084fc" opacity="0.15" />
    </svg>
  )
}

function PlayPauseIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

// Mini collapsed player in the bar — click to open side panel
function MiniBarPlayer() {
  const [connected, setConnected] = useState(false)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [panelOpen, setPanelOpenLocal] = useState(getPanelOpen())
  const [actionPending, setActionPending] = useState(false)
  const wasPlayingRef = useRef(false)
  const prevTitleRef  = useRef('')
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => { setConnected(!!loadTokens()) }, [])

  // Sync panel open state
  useEffect(() => subscribePanelOpen(() => setPanelOpenLocal(getPanelOpen())), [])

  const poll = useCallback(async () => {
    const result = await getNowPlaying()
    if (!result) return
    if (result.title && result.title !== prevTitleRef.current) prevTitleRef.current = result.title
    setNowPlaying(result)
    if (result.isPlaying && !wasPlayingRef.current) {
      pauseGardenMusic(); wasPlayingRef.current = true
    } else if (!result.isPlaying && wasPlayingRef.current) {
      resumeGardenMusic(); wasPlayingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!connected) { clearInterval(pollRef.current); setNowPlaying(null); return }
    poll()
    pollRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [connected, poll])

  async function handlePlayPause(e: React.MouseEvent) {
    e.stopPropagation()
    if (actionPending || !nowPlaying) return
    setActionPending(true)
    const playing = nowPlaying.isPlaying
    setNowPlaying({ ...nowPlaying, isPlaying: !playing })
    await (playing ? spotifyPause() : spotifyPlay())
    setTimeout(() => { poll(); setActionPending(false) }, 600)
  }

  const isPlaying = nowPlaying?.isPlaying ?? false

  if (!connected) {
    return (
      <button
        onClick={startLogin}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(200,130,255,0.08)', border: '1px solid rgba(200,130,255,0.2)',
          borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
          color: 'rgba(200,150,255,0.7)', fontFamily: "'Caveat', cursive",
          fontSize: 13, letterSpacing: '0.04em',
        }}
      >
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1DB954', boxShadow: '0 0 6px #1DB954' }} />
        connect spotify
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {/* Album disc — click opens panel */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        title={panelOpen ? 'Close player' : 'Open player'}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: panelOpen ? 'rgba(255,255,255,0.08)' : 'none',
          border: panelOpen ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
          borderRadius: 10, padding: '4px 10px 4px 4px',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { if (!panelOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={e => { if (!panelOpen) e.currentTarget.style.background = 'none' }}
      >
        <motion.div
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={isPlaying ? { duration: 12, repeat: Infinity, ease: 'linear' } : { duration: 0.8 }}
          style={{
            width: 30, height: 30, borderRadius: '50%', overflow: 'hidden',
            border: `1.5px solid ${isPlaying ? 'rgba(240,100,180,0.6)' : 'rgba(200,130,255,0.3)'}`,
            background: '#1a0a2e', position: 'relative', flexShrink: 0,
            boxShadow: isPlaying ? '0 0 10px rgba(240,100,180,0.35)' : 'none',
          }}
        >
          {nowPlaying?.albumArt
            ? <Image src={nowPlaying.albumArt} alt="" fill className="object-cover" sizes="30px" unoptimized />
            : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(200,130,255,0.5)' }} />
              </div>
          }
        </motion.div>

        <div style={{ maxWidth: 150, textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
            {isPlaying ? nowPlaying!.title : 'nothing playing'}
          </p>
          {isPlaying && (
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {nowPlaying!.artist}
            </p>
          )}
        </div>
      </button>

      {/* Inline play/pause button */}
      {nowPlaying && (
        <button
          onClick={handlePlayPause}
          disabled={actionPending}
          style={{
            width: 30, height: 30, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(200,130,255,0.25)',
            cursor: 'pointer', color: 'rgba(220,180,255,0.9)', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.3)'; e.currentTarget.style.color = '#f9a8d4' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.15)'; e.currentTarget.style.color = 'rgba(220,180,255,0.9)' }}
        >
          <PlayPauseIcon playing={isPlaying} />
        </button>
      )}
    </div>
  )
}

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
        background: 'rgba(5, 2, 15, 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div style={{ flex: '0 0 auto', minWidth: 240 }}>
        <MiniBarPlayer />
      </div>

      <nav style={{ display: 'flex', gap: 8 }}>
        {[{ href: '/', label: '🌸 Garden' }, { href: '/today', label: '📷 Today' }].map(({ href, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} style={{
              fontFamily: "'Caveat', cursive", fontSize: 16, letterSpacing: '0.04em',
              padding: '6px 18px', borderRadius: 20, textDecoration: 'none', transition: 'all 0.25s',
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

      <div style={{ flex: '0 0 auto', minWidth: 240, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(192,132,252,0.07)', border: '1px solid rgba(192,132,252,0.12)' }}>
          <MoonIcon />
        </div>
      </div>
    </motion.header>
  )
}
