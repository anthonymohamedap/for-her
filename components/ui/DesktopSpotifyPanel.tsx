'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  startLogin, loadTokens, clearTokens, getNowPlaying, getPlaylistId, getPlaylistTracks,
  PLAYLIST_URL, type NowPlaying, type PlaylistTrack,
  spotifyPlay, spotifyPause, spotifyNext, spotifyPrev, spotifySeek, spotifyPlayTrack,
} from '@/lib/spotify'
import { pauseGardenMusic, resumeGardenMusic } from '@/components/ui/AudioToggle'
import { getPanelOpen, subscribePanelOpen, setPanelOpen } from '@/lib/panelStore'

const POLL_MS = 12_000
const PANEL_W = 300
const PLAYLIST_FETCH_KEY = 'spotify_playlist_fetched'

function fmt(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function PlayPauseIcon({ playing, size = 20 }: { playing: boolean; size?: number }) {
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
function PrevIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}><polygon points="19,20 9,12 19,4" /><rect x="5" y="4" width="3" height="16" /></svg> }
function NextIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}><polygon points="5,4 15,12 5,20" /><rect x="16" y="4" width="3" height="16" /></svg> }

function CtrlBtn({ onClick, children, large, disabled }: { onClick: () => void; children: React.ReactNode; large?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: large ? 'rgba(168,85,247,0.2)' : 'none', border: large ? '1px solid rgba(200,130,255,0.35)' : 'none', borderRadius: '50%', cursor: disabled ? 'default' : 'pointer', color: disabled ? 'rgba(220,180,255,0.3)' : 'rgba(220,180,255,0.9)', transition: 'all 0.2s', flexShrink: 0 }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.color = '#f9a8d4'; e.currentTarget.style.transform = 'scale(1.1)' } }}
      onMouseLeave={e => { e.currentTarget.style.color = disabled ? 'rgba(220,180,255,0.3)' : 'rgba(220,180,255,0.9)'; e.currentTarget.style.transform = 'scale(1)' }}
    >{children}</button>
  )
}

export default function DesktopSpotifyPanel() {
  const [open, setOpen] = useState(getPanelOpen())
  const [connected, setConnected] = useState(false)
  const [tab, setTab] = useState<'player' | 'playlist'>('player')
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [songPulse, setSongPulse] = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const [tracks, setTracks] = useState<PlaylistTrack[]>([])
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [trackError, setTrackError] = useState(false)
  const wasPlayingRef = useRef(false)
  const prevTitleRef  = useRef('')
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => subscribePanelOpen(() => setOpen(getPanelOpen())), [])

  // Never auto-connect — user must press connect each session
  function handleConnect() {
    if (loadTokens()) { setConnected(true) }
    else { startLogin() }
  }

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
    if (!connected) { clearInterval(pollRef.current); setNowPlaying(null); return }
    poll()
    pollRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [connected, poll])

  // Load playlist tracks — sessionStorage guard prevents loop across remounts
  function loadPlaylist() {
    const id = getPlaylistId()
    if (!id) return
    setTrackError(false)
    setLoadingTracks(true)
    sessionStorage.setItem(PLAYLIST_FETCH_KEY, '1')
    getPlaylistTracks(id).then(t => {
      if (t.length === 0) {
        setTrackError(true)
        // Keep the guard set — do NOT remove it here or the effect will loop
      } else {
        setTracks(t)
      }
      setLoadingTracks(false)
    })
  }

  useEffect(() => {
    if (tab !== 'playlist' || tracks.length > 0 || loadingTracks || trackError) return
    if (sessionStorage.getItem(PLAYLIST_FETCH_KEY)) return
    loadPlaylist()
  }, [tab, tracks.length, loadingTracks, trackError])

  const isPlaying = nowPlaying?.isPlaying ?? false
  const progress  = nowPlaying && nowPlaying.durationMs > 0 ? nowPlaying.progressMs / nowPlaying.durationMs : 0

  async function handlePlayPause() {
    if (actionPending || !nowPlaying) return
    setActionPending(true)
    setNowPlaying({ ...nowPlaying, isPlaying: !isPlaying })
    await (isPlaying ? spotifyPause() : spotifyPlay())
    setTimeout(() => { poll(); setActionPending(false) }, 600)
  }
  async function handleNext() {
    if (actionPending) return
    setActionPending(true); await spotifyNext()
    setTimeout(() => { poll(); setActionPending(false) }, 800)
  }
  async function handlePrev() {
    if (actionPending) return
    setActionPending(true); await spotifyPrev()
    setTimeout(() => { poll(); setActionPending(false) }, 800)
  }
  function handleSeekClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!nowPlaying || nowPlaying.durationMs === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const ms   = pct * nowPlaying.durationMs
    setNowPlaying({ ...nowPlaying, progressMs: ms })
    spotifySeek(ms).then(() => setTimeout(poll, 1000))
  }
  async function handlePlayTrack(uri: string) {
    if (actionPending) return
    setActionPending(true)
    await spotifyPlayTrack(uri)
    setTab('player')
    setTimeout(() => { poll(); setActionPending(false) }, 800)
  }

  const activeUri = nowPlaying?.title ? tracks.find(t => t.title === nowPlaying.title)?.uri : undefined

  return (
    <div className="hidden md:block">
      <AnimatePresence>
        {open && (
          <motion.aside key="panel" initial={{ x: -PANEL_W }} animate={{ x: 0 }} exit={{ x: -PANEL_W }} transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            style={{ position: 'fixed', top: 'var(--bar-height-desktop)', left: 0, width: PANEL_W, bottom: 0, zIndex: 80, background: 'rgba(5, 2, 16, 0.97)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', borderRight: '1px solid rgba(200,130,255,0.15)', boxShadow: '6px 0 48px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <motion.div animate={songPulse ? { opacity: [0, 0.2, 0] } : { opacity: 0 }} transition={{ duration: 1.4 }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center 35%, rgba(168,85,247,0.4) 0%, transparent 65%)' }} />

            <button onClick={() => setPanelOpen(false)} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(200,130,255,0.5)', fontSize: 13, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(200,130,255,0.5)' }}
            >✕</button>

            {/* Tabs — only when connected */}
            {connected && (
              <div style={{ flexShrink: 0, display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginTop: 14 }}>
                {(['player', 'playlist'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0', fontSize: 12, fontFamily: "'Caveat', cursive", letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer', color: tab === t ? 'rgba(249,168,212,0.9)' : 'rgba(200,130,255,0.4)', borderBottom: tab === t ? '2px solid rgba(249,168,212,0.7)' : '2px solid transparent', transition: 'all 0.2s' }}>
                    {t === 'player' ? '♪ now playing' : '☰ playlist'}
                  </button>
                ))}
              </div>
            )}

            {/* Not connected view */}
            {!connected && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 28px 40px' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(200,130,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="rgba(200,150,255,0.6)" style={{ width: 32, height: 32 }}>
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: 'var(--text-primary)' }}>connect spotify</p>
                  <p style={{ margin: '6px 0 0', fontFamily: "'Caveat', cursive", fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>to listen together</p>
                </div>
                <button onClick={handleConnect}
                  style={{ marginTop: 8, padding: '10px 28px', borderRadius: 50, background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(200,130,255,0.4)', cursor: 'pointer', fontFamily: "'Caveat', cursive", fontSize: 15, color: 'rgba(220,180,255,0.9)', letterSpacing: '0.05em', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.35)'; e.currentTarget.style.borderColor = 'rgba(249,168,212,0.7)'; e.currentTarget.style.color = 'white' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.2)'; e.currentTarget.style.borderColor = 'rgba(200,130,255,0.4)'; e.currentTarget.style.color = 'rgba(220,180,255,0.9)' }}
                >
                  ♪ sign in with spotify
                </button>
              </div>
            )}

            {connected && (
              <AnimatePresence mode="wait">
                {tab === 'player' ? (
                  <motion.div key="player" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Album art */}
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 40, paddingBottom: 20 }}>
                      <motion.div animate={{ rotate: isPlaying ? 360 : 0 }} transition={isPlaying ? { duration: 12, repeat: Infinity, ease: 'linear' } : { duration: 0.8, ease: 'easeOut' }}
                        style={{ width: 168, height: 168, borderRadius: '50%', overflow: 'hidden', border: '2.5px solid rgba(200,130,255,0.35)', background: '#1a0a2e', position: 'relative', boxShadow: isPlaying ? '0 0 36px rgba(240,100,180,0.45), 0 0 70px rgba(168,85,247,0.22)' : '0 0 14px rgba(168,85,247,0.18)' }}
                      >
                        {nowPlaying?.albumArt
                          ? <Image src={nowPlaying.albumArt} alt="album" fill className="object-cover" sizes="168px" unoptimized />
                          : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'repeating-radial-gradient(circle, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)' }}>
                              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(200,130,255,0.45)' }} />
                            </div>
                        }
                      </motion.div>
                    </div>
                    {/* Track info */}
                    <div style={{ flexShrink: 0, padding: '0 28px 16px', textAlign: 'center' }}>
                      <AnimatePresence mode="wait">
                        <motion.div key={nowPlaying?.title ?? 'idle'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.3 }}>
                          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.3 }}>
                            {isPlaying ? nowPlaying!.title : 'nothing playing…'}
                          </p>
                          {isPlaying && <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--text-secondary)', fontFamily: "'Caveat', cursive", fontStyle: 'italic' }}>{nowPlaying!.artist}</p>}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                    {/* Seek bar */}
                    <div style={{ flexShrink: 0, padding: '0 28px 8px' }}>
                      <div onClick={handleSeekClick} style={{ width: '100%', height: 20, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4, position: 'relative' }}>
                          <div style={{ width: `${progress * 100}%`, height: '100%', background: 'linear-gradient(90deg,#c084fc,#f472b6)', borderRadius: 4, boxShadow: '0 0 10px rgba(240,100,180,0.5)', transition: 'width 2s linear', position: 'relative' }}>
                            <div style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', background: '#f9a8d4', boxShadow: '0 0 10px rgba(249,168,212,0.9)' }} />
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(200,150,255,0.4)', fontFamily: 'monospace', marginTop: 2 }}>
                        <span>{nowPlaying ? fmt(nowPlaying.progressMs) : '0:00'}</span>
                        <span>{nowPlaying ? fmt(nowPlaying.durationMs) : '0:00'}</span>
                      </div>
                    </div>
                    {/* Controls */}
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '8px 28px 16px' }}>
                      <CtrlBtn onClick={handlePrev} disabled={actionPending}><PrevIcon /></CtrlBtn>
                      <CtrlBtn onClick={handlePlayPause} disabled={actionPending} large><PlayPauseIcon playing={isPlaying} size={24} /></CtrlBtn>
                      <CtrlBtn onClick={handleNext} disabled={actionPending}><NextIcon /></CtrlBtn>
                    </div>
                    <div style={{ flex: 1 }} />
                    <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 28px 20px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                      {PLAYLIST_URL && (
                        <button onClick={() => setTab('playlist')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Caveat', cursive", fontSize: 15, color: 'rgba(200,150,255,0.65)', transition: 'color 0.2s', padding: 0 }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(249,168,212,0.9)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(200,150,255,0.65)')}>
                          ☰ our playlist
                        </button>
                      )}
                      <button onClick={() => { clearTokens(); sessionStorage.removeItem(PLAYLIST_FETCH_KEY); setConnected(false); setTracks([]); setTrackError(false); setPanelOpen(false) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontFamily: "'Courier New', monospace", padding: '4px 8px', transition: 'color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                        ⚙ disconnect
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="playlist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Status */}
                    <div style={{ flexShrink: 0, padding: '10px 16px 6px' }}>
                      <p style={{ margin: 0, fontSize: 10, fontFamily: "'Caveat', cursive", color: 'rgba(200,130,255,0.35)', letterSpacing: '0.04em' }}>
                        {loadingTracks ? 'loading…' : trackError ? 'could not load playlist' : tracks.length > 0 ? `${tracks.length} songs` : ''}
                      </p>
                      {trackError && (
                        <button onClick={() => { sessionStorage.removeItem(PLAYLIST_FETCH_KEY); setTrackError(false); loadPlaylist() }} style={{ marginTop: 6, background: 'none', border: '1px solid rgba(200,130,255,0.3)', borderRadius: 20, padding: '3px 14px', cursor: 'pointer', fontFamily: "'Caveat', cursive", fontSize: 12, color: 'rgba(200,130,255,0.7)' }}>retry</button>
                      )}
                    </div>
                    {/* Track list — no search */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                      {loadingTracks && (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(200,130,255,0.4)', fontFamily: "'Caveat', cursive", fontSize: 15 }}>loading songs…</div>
                      )}
                      {tracks.map((track, i) => {
                        const isActive = track.uri === activeUri
                        return (
                          <motion.div key={track.uri} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.012, duration: 0.22 }}
                            onClick={() => handlePlayTrack(track.uri)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: actionPending ? 'default' : 'pointer', background: isActive ? 'rgba(168,85,247,0.12)' : 'none', borderLeft: isActive ? '2px solid rgba(249,168,212,0.8)' : '2px solid transparent', transition: 'background 0.15s' }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none' }}
                          >
                            <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#1a0a2e', position: 'relative' }}>
                              {track.albumArt
                                ? <Image src={track.albumArt} alt="" fill className="object-cover" sizes="36px" unoptimized />
                                : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(168,85,247,0.15)' }}><span style={{ fontSize: 11, color: 'rgba(200,130,255,0.5)' }}>♪</span></div>
                              }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? 'rgba(249,168,212,0.95)' : 'rgba(220,200,255,0.85)', fontFamily: "'Cormorant Garamond', serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</p>
                              <p style={{ margin: '2px 0 0', fontSize: 10, color: isActive ? 'rgba(200,150,255,0.7)' : 'rgba(180,150,255,0.4)', fontFamily: "'Caveat', cursive", fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</p>
                            </div>
                            <span style={{ fontSize: 10, color: 'rgba(200,130,255,0.35)', fontFamily: 'monospace', flexShrink: 0 }}>{fmt(track.durationMs)}</span>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
