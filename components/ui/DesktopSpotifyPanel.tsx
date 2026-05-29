'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  loadTokens, clearTokens, getNowPlaying, getPlaylistId, getPlaylistTracks,
  searchTracks, addTrackToPlaylist,
  PLAYLIST_URL, type NowPlaying, type PlaylistTrack, type SearchTrack,
  spotifyPlay, spotifyPause, spotifyNext, spotifyPrev, spotifySeek, spotifyPlayTrack,
} from '@/lib/spotify'
import { pauseGardenMusic, resumeGardenMusic } from '@/components/ui/AudioToggle'
import { getPanelOpen, subscribePanelOpen, setPanelOpen } from '@/lib/panelStore'

const POLL_MS = 12_000
const PANEL_W = 300

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
    <button onClick={onClick} disabled={disabled} style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: large ? 'rgba(168,85,247,0.2)' : 'none', border: large ? '1px solid rgba(200,130,255,0.35)' : 'none', borderRadius: '50%', cursor: disabled ? 'default' : 'pointer', color: disabled ? 'rgba(220,180,255,0.3)' : 'rgba(220,180,255,0.9)', transition: 'all 0.2s', flexShrink: 0 }}
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
  // Search state
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [addedUris, setAddedUris] = useState<Set<string>>(new Set())
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const wasPlayingRef = useRef(false)
  const prevTitleRef  = useRef('')
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => subscribePanelOpen(() => setOpen(getPanelOpen())), [])
  useEffect(() => { setConnected(!!loadTokens()) }, [])

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

  useEffect(() => {
    if (tab !== 'playlist' || tracks.length > 0 || loadingTracks) return
    const id = getPlaylistId()
    if (!id) return
    setLoadingTracks(true)
    getPlaylistTracks(id).then(t => { setTracks(t); setLoadingTracks(false) })
  }, [tab, tracks.length, loadingTracks])

  // Debounced search
  function handleQueryChange(q: string) {
    setQuery(q)
    clearTimeout(searchTimerRef.current)
    if (!q.trim()) { setSearchResults([]); return }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true)
      const results = await searchTracks(q)
      setSearchResults(results)
      setSearching(false)
    }, 400)
  }

  async function handleAddTrack(track: SearchTrack) {
    const id = getPlaylistId()
    if (!id) return
    const ok = await addTrackToPlaylist(id, track.uri)
    if (ok) {
      setAddedUris(prev => { const s = new Set(Array.from(prev)); s.add(track.uri); return s })
      // Refresh playlist
      setTracks([])
      setLoadingTracks(false)
    }
  }

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

  const activeUri = isPlaying ? tracks.find(t => t.title === nowPlaying?.title)?.uri : undefined
  const displayList = query.trim() ? searchResults : tracks

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

            {/* Tabs */}
            <div style={{ flexShrink: 0, display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginTop: 14 }}>
              {(['player', 'playlist'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0', fontSize: 12, fontFamily: "'Caveat', cursive", letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer', color: tab === t ? 'rgba(249,168,212,0.9)' : 'rgba(200,130,255,0.4)', borderBottom: tab === t ? '2px solid rgba(249,168,212,0.7)' : '2px solid transparent', transition: 'all 0.2s' }}>
                  {t === 'player' ? '♪ now playing' : '☰ our playlist'}
                </button>
              ))}
            </div>

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
                      <button onClick={() => setTab('playlist')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Caveat', cursive", fontSize: 15, color: 'rgba(200,150,255,0.65)', transition: 'color 0.2s', padding: 0 }} onMouseEnter={e => (e.currentTarget.style.color = 'rgba(249,168,212,0.9)')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(200,150,255,0.65)')}>
                        ☰ browse & add songs
                      </button>
                    )}
                    <button onClick={() => { clearTokens(); setConnected(false); setPanelOpen(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontFamily: "'Courier New', monospace", padding: '4px 8px', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                      ⚙ disconnect
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="playlist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Search bar */}
                  <div style={{ flexShrink: 0, padding: '10px 16px 8px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: 10, fontSize: 12, color: 'rgba(200,130,255,0.4)', pointerEvents: 'none' }}>🔍</span>
                      <input
                        type="text"
                        placeholder="search to add a song…"
                        value={query}
                        onChange={e => handleQueryChange(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px 8px 30px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,130,255,0.2)', borderRadius: 20, color: 'rgba(220,200,255,0.9)', fontSize: 12, fontFamily: "'Caveat', cursive", outline: 'none', boxSizing: 'border-box' }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(249,168,212,0.5)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(200,130,255,0.2)')}
                      />
                      {query && (
                        <button onClick={() => { setQuery(''); setSearchResults([]) }} style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(200,130,255,0.5)', fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                    {query && (
                      <p style={{ margin: '4px 0 0 4px', fontSize: 10, fontFamily: "'Caveat', cursive", color: 'rgba(200,130,255,0.4)', letterSpacing: '0.05em' }}>
                        {searching ? 'searching…' : searchResults.length > 0 ? `${searchResults.length} results — click + to add` : 'no results'}
                      </p>
                    )}
                    {!query && (
                      <p style={{ margin: '4px 0 0 4px', fontSize: 10, fontFamily: "'Caveat', cursive", color: 'rgba(200,130,255,0.35)', letterSpacing: '0.04em' }}>
                        {tracks.length > 0 ? `${tracks.length} songs in playlist` : loadingTracks ? 'loading…' : ''}
                      </p>
                    )}
                  </div>

                  {/* Track list */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                    {!query && loadingTracks && <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(200,130,255,0.4)', fontFamily: "'Caveat', cursive", fontSize: 15 }}>loading songs…</div>}
                    {displayList.map((track, i) => {
                      const isActive = track.uri === activeUri
                      const isAdded = addedUris.has(track.uri)
                      const inPlaylist = !query || tracks.some(t => t.uri === track.uri)
                      return (
                        <motion.div key={track.uri} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.012, duration: 0.22 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: isActive ? 'rgba(168,85,247,0.12)' : 'none', borderLeft: isActive ? '2px solid rgba(249,168,212,0.8)' : '2px solid transparent', transition: 'background 0.15s' }}
                        >
                          {/* Album art — clickable to play */}
                          <button onClick={() => handlePlayTrack(track.uri)} disabled={actionPending} style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#1a0a2e', position: 'relative', border: 'none', cursor: 'pointer', padding: 0 }}>
                            {(track as PlaylistTrack).albumArt
                              ? <Image src={(track as PlaylistTrack).albumArt!} alt="" fill className="object-cover" sizes="36px" unoptimized />
                              : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(168,85,247,0.15)' }}><span style={{ fontSize: 11, color: 'rgba(200,130,255,0.5)' }}>♪</span></div>
                            }
                          </button>
                          {/* Text — clickable to play */}
                          <button onClick={() => handlePlayTrack(track.uri)} disabled={actionPending} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? 'rgba(249,168,212,0.95)' : 'rgba(220,200,255,0.85)', fontFamily: "'Cormorant Garamond', serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 10, color: isActive ? 'rgba(200,150,255,0.7)' : 'rgba(180,150,255,0.4)', fontFamily: "'Caveat', cursive", fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</p>
                          </button>
                          {/* Add button (search mode) or duration (playlist mode) */}
                          {query ? (
                            <button
                              onClick={() => handleAddTrack(track as SearchTrack)}
                              disabled={inPlaylist || isAdded}
                              title={inPlaylist || isAdded ? 'already in playlist' : 'add to playlist'}
                              style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: inPlaylist || isAdded ? 'rgba(200,130,255,0.2)' : 'rgba(200,130,255,0.5)', background: inPlaylist || isAdded ? 'rgba(168,85,247,0.08)' : 'rgba(168,85,247,0.15)', cursor: inPlaylist || isAdded ? 'default' : 'pointer', color: inPlaylist || isAdded ? 'rgba(200,130,255,0.3)' : 'rgba(249,168,212,0.9)', fontSize: 14, transition: 'all 0.2s' }}
                              onMouseEnter={e => { if (!(inPlaylist || isAdded)) { e.currentTarget.style.background = 'rgba(168,85,247,0.35)'; e.currentTarget.style.borderColor = 'rgba(249,168,212,0.8)' } }}
                              onMouseLeave={e => { if (!(inPlaylist || isAdded)) { e.currentTarget.style.background = 'rgba(168,85,247,0.15)'; e.currentTarget.style.borderColor = 'rgba(200,130,255,0.5)' } }}
                            >
                              {inPlaylist || isAdded ? '✓' : '+'}
                            </button>
                          ) : (
                            <span style={{ fontSize: 10, color: 'rgba(200,130,255,0.35)', fontFamily: 'monospace', flexShrink: 0 }}>{fmt(track.durationMs)}</span>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
