'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  startLogin, loadTokens, clearTokens,
  getNowPlaying, getPlaylistId, getPlaylistTracks,
  searchTracks, addTrackToPlaylist,
  PLAYLIST_URL, type NowPlaying, type PlaylistTrack, type SearchTrack,
  spotifyPlay, spotifyPause, spotifyNext, spotifyPrev, spotifySeek, spotifyPlayTrack,
} from '@/lib/spotify'
import { pauseGardenMusic, resumeGardenMusic } from '@/components/ui/AudioToggle'

const POLL_MS = 12_000

const GLASS: React.CSSProperties = {
  background: 'rgba(15,5,30,0.6)',
  backdropFilter: 'blur(20px) saturate(1.4)',
  border: '1px solid rgba(200,130,255,0.15)',
  boxShadow: '0 0 20px rgba(168,85,247,0.1), 0 4px 24px rgba(0,0,0,0.4)',
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function SpotifyWidget() {
  const [connected, setConnected]   = useState(false)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState(false)
  const [tab, setTab]               = useState<'player' | 'playlist'>('player')
  const [songPulse, setSongPulse]   = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const [tracks, setTracks]         = useState<PlaylistTrack[]>([])
  const [loadingTracks, setLoadingTracks] = useState(false)
  const tracksTriedRef = useRef(false)
  const [query, setQuery]           = useState('')
  const [searchResults, setSearchResults] = useState<SearchTrack[]>([])
  const [searching, setSearching]   = useState(false)
  const [addedUris, setAddedUris]   = useState<Set<string>>(new Set())
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>()
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
    if (result.isPlaying && !wasPlayingRef.current) { pauseGardenMusic(); wasPlayingRef.current = true }
    else if (!result.isPlaying && wasPlayingRef.current) { resumeGardenMusic(); wasPlayingRef.current = false }
  }, [])

  useEffect(() => {
    if (!connected) { clearInterval(pollRef.current); if (wasPlayingRef.current) { resumeGardenMusic(); wasPlayingRef.current = false } setNowPlaying(null); return }
    poll(); pollRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [connected, poll])

  useEffect(() => {
    if (tab !== 'playlist' || tracks.length > 0 || loadingTracks) return
    const id = getPlaylistId(); if (!id) return
    setLoadingTracks(true)
    getPlaylistTracks(id).then(t => { setTracks(t); setLoadingTracks(false) })
  }, [tab, tracks.length, loadingTracks])

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
    const id = getPlaylistId(); if (!id) return
    const ok = await addTrackToPlaylist(id, track.uri)
    if (ok) { setAddedUris(prev => { const s = new Set(Array.from(prev)); s.add(track.uri); return s }); setTracks([]); setLoadingTracks(false); tracksTriedRef.current = false }
  }

  async function handlePlayPause() {
    if (actionPending || !nowPlaying) return
    setActionPending(true); const playing = nowPlaying.isPlaying
    setNowPlaying({ ...nowPlaying, isPlaying: !playing })
    await (playing ? spotifyPause() : spotifyPlay())
    setTimeout(() => { poll(); setActionPending(false) }, 600)
  }
  async function handleNext() { if (actionPending) return; setActionPending(true); await spotifyNext(); setTimeout(() => { poll(); setActionPending(false) }, 800) }
  async function handlePrev() { if (actionPending) return; setActionPending(true); await spotifyPrev(); setTimeout(() => { poll(); setActionPending(false) }, 800) }
  async function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!nowPlaying || nowPlaying.durationMs === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ms = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * nowPlaying.durationMs
    setNowPlaying({ ...nowPlaying, progressMs: ms }); await spotifySeek(ms); setTimeout(poll, 1000)
  }
  async function handlePlayTrack(uri: string) {
    if (actionPending) return; setActionPending(true); await spotifyPlayTrack(uri); setTab('player')
    setTimeout(() => { poll(); setActionPending(false) }, 800)
  }

  if (loading) return null

  const isPlaying = nowPlaying?.isPlaying ?? false
  const progress  = nowPlaying && nowPlaying.durationMs > 0 ? nowPlaying.progressMs / nowPlaying.durationMs : 0
  const activeUri = isPlaying ? tracks.find(t => t.title === nowPlaying?.title)?.uri : undefined
  const displayList = query.trim() ? searchResults : tracks

  const springIn = { hidden: { y: -80, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, damping: 20, stiffness: 200, delay: 2.5 } } }

  const AlbumArt = ({ size }: { size: number }) => (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <motion.div animate={{ rotate: isPlaying ? 360 : 0 }} transition={isPlaying ? { duration: 12, repeat: Infinity, ease: 'linear' } : { duration: 0.8, ease: 'easeOut' }}
        style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(200,130,255,0.3)', boxShadow: isPlaying ? '0 0 16px rgba(240,100,180,0.4), 0 0 32px rgba(168,85,247,0.2)' : '0 0 8px rgba(168,85,247,0.15)', background: '#1a0a2e', position: 'relative' }}
      >
        {nowPlaying?.albumArt
          ? <Image src={nowPlaying.albumArt} alt="album" fill className="object-cover" sizes={`${size}px`} unoptimized />
          : <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'repeating-radial-gradient(circle, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: size * 0.14, height: size * 0.14, borderRadius: '50%', background: 'rgba(200,130,255,0.5)' }} />
            </div>
        }
      </motion.div>
    </div>
  )

  if (!connected) {
    return (
      <motion.div variants={springIn} initial="hidden" animate="visible" className="md:hidden" style={{ position: 'fixed', top: 16, left: 16, zIndex: 50 }}>
        <motion.button onClick={startLogin} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} style={{ ...GLASS, borderRadius: 50, padding: '8px 16px 8px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <SpotifyLogo size={14} />
          <span style={{ fontFamily: "'Caveat', cursive", fontSize: 13, color: 'rgba(200,150,255,0.7)', letterSpacing: '0.05em' }}>connect spotify</span>
        </motion.button>
      </motion.div>
    )
  }

  const CollapsedPill = () => (
    <div onClick={() => setExpanded(true)} style={{ ...GLASS, borderRadius: 50, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px 8px 8px', cursor: 'pointer' }}>
      <AlbumArt size={40} />
      <div style={{ flex: 1, minWidth: 0, maxWidth: 130 }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: 'rgba(255,240,255,0.9)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>{isPlaying ? nowPlaying!.title : 'nothing playing…'}</p>
        {isPlaying && <p style={{ fontFamily: "'Caveat', cursive", fontSize: 10, color: 'rgba(200,150,255,0.6)', fontStyle: 'italic', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nowPlaying!.artist}</p>}
      </div>
      <PlayPauseIcon playing={isPlaying} size={26} />
    </div>
  )

  const ExpandedCard = () => (
    <div style={{ ...GLASS, borderRadius: 20, width: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', maxHeight: '82vh' }}>
      <motion.div animate={songPulse ? { scale: [1,1.5,1], opacity: [0.1,0.25,0.1] } : { scale: 1, opacity: 0.1 }} transition={{ duration: 1.2 }} style={{ position: 'absolute', inset: -30, background: 'radial-gradient(ellipse, rgba(168,85,247,0.2) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
        <button onClick={() => setExpanded(false)} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: 'rgba(200,130,255,0.35)', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: 4 }}>▴</button>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginTop: 8 }}>
          {(['player', 'playlist'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0', fontSize: 12, fontFamily: "'Caveat', cursive", letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer', color: tab === t ? 'rgba(249,168,212,0.9)' : 'rgba(200,130,255,0.4)', borderBottom: tab === t ? '2px solid rgba(249,168,212,0.7)' : '2px solid transparent', transition: 'all 0.2s' }}>
              {t === 'player' ? '♪ now playing' : '☰ playlist'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'player' ? (
          <motion.div key="player" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 16 }}>
            <AlbumArt size={110} />
            <div style={{ width: '100%', textAlign: 'center' }}>
              <AnimatePresence mode="wait">
                <motion.div key={nowPlaying?.title ?? 'idle'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.35 }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isPlaying ? nowPlaying!.title : 'nothing playing…'}</p>
                  {isPlaying && <p style={{ fontFamily: "'Caveat', cursive", fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nowPlaying!.artist}</p>}
                </motion.div>
              </AnimatePresence>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              <CtrlBtn onClick={handlePrev}><PrevIcon /></CtrlBtn>
              <CtrlBtn onClick={handlePlayPause} large><PlayPauseIcon playing={isPlaying} size={36} /></CtrlBtn>
              <CtrlBtn onClick={handleNext}><NextIcon /></CtrlBtn>
            </div>
            <div onClick={handleSeek} style={{ width: '100%', cursor: 'pointer' }}><ProgressBar progress={progress} /></div>
            <MobileSessionModal onDisconnect={disconnect} />
          </motion.div>
        ) : (
          <motion.div key="playlist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            {/* Search bar */}
            <div style={{ flexShrink: 0, padding: '10px 14px 6px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 9, fontSize: 11, color: 'rgba(200,130,255,0.4)', pointerEvents: 'none' }}>🔍</span>
                <input type="text" placeholder="search to add a song…" value={query} onChange={e => handleQueryChange(e.target.value)}
                  style={{ width: '100%', padding: '7px 28px 7px 27px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,130,255,0.2)', borderRadius: 20, color: 'rgba(220,200,255,0.9)', fontSize: 12, fontFamily: "'Caveat', cursive", outline: 'none', boxSizing: 'border-box' }}
                />
                {query && <button onClick={() => { setQuery(''); setSearchResults([]) }} style={{ position: 'absolute', right: 9, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(200,130,255,0.5)', fontSize: 11, padding: 0 }}>✕</button>}
              </div>
              <p style={{ margin: '3px 0 0 4px', fontSize: 10, fontFamily: "'Caveat', cursive", color: 'rgba(200,130,255,0.35)' }}>
                {query ? (searching ? 'searching…' : searchResults.length > 0 ? `${searchResults.length} results — tap + to add` : 'no results') : tracks.length > 0 ? `${tracks.length} songs` : loadingTracks ? 'loading…' : ''}
              </p>
            </div>
            {/* List */}
            <div style={{ overflowY: 'auto', maxHeight: '52vh' }}>
              {!query && loadingTracks && <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(200,130,255,0.4)', fontFamily: "'Caveat', cursive", fontSize: 14 }}>loading…</div>}
              {displayList.map(track => {
                const isActive = track.uri === activeUri
                const isAdded = addedUris.has(track.uri)
                const inPlaylist = !query || tracks.some(t => t.uri === track.uri)
                return (
                  <div key={track.uri} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', background: isActive ? 'rgba(168,85,247,0.12)' : 'none', borderLeft: isActive ? '2px solid rgba(249,168,212,0.8)' : '2px solid transparent' }}>
                    <button onClick={() => handlePlayTrack(track.uri)} disabled={actionPending} style={{ width: 34, height: 34, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: '#1a0a2e', position: 'relative', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {(track as PlaylistTrack).albumArt
                        ? <Image src={(track as PlaylistTrack).albumArt!} alt="" fill className="object-cover" sizes="34px" unoptimized />
                        : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(168,85,247,0.15)' }}><span style={{ fontSize: 10 }}>♪</span></div>
                      }
                    </button>
                    <button onClick={() => handlePlayTrack(track.uri)} disabled={actionPending} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? 'rgba(249,168,212,0.95)' : 'rgba(220,200,255,0.85)', fontFamily: "'Cormorant Garamond', serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</p>
                      <p style={{ margin: '1px 0 0', fontSize: 10, color: 'rgba(180,150,255,0.45)', fontFamily: "'Caveat', cursive", fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</p>
                    </button>
                    {query ? (
                      <button onClick={() => handleAddTrack(track as SearchTrack)} disabled={inPlaylist || isAdded}
                        style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: inPlaylist || isAdded ? 'rgba(200,130,255,0.15)' : 'rgba(200,130,255,0.5)', background: inPlaylist || isAdded ? 'rgba(168,85,247,0.05)' : 'rgba(168,85,247,0.15)', cursor: inPlaylist || isAdded ? 'default' : 'pointer', color: inPlaylist || isAdded ? 'rgba(200,130,255,0.3)' : 'rgba(249,168,212,0.9)', fontSize: 13 }}
                      >{inPlaylist || isAdded ? '✓' : '+'}</button>
                    ) : (
                      <span style={{ fontSize: 9, color: 'rgba(200,130,255,0.3)', fontFamily: 'monospace', flexShrink: 0 }}>{fmt(track.durationMs)}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  return (
    <motion.div variants={springIn} initial="hidden" animate="visible" className="md:hidden" style={{ position: 'fixed', top: 16, left: 16, zIndex: 50, width: 'calc(100vw - 32px)', maxWidth: 300 }}>
      <AnimatePresence mode="wait">
        {expanded
          ? <motion.div key="expanded" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}><ExpandedCard /></motion.div>
          : <motion.div key="pill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}><CollapsedPill /></motion.div>
        }
      </AnimatePresence>
    </motion.div>
  )
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div style={{ width: '100%', height: 20, display: 'flex', alignItems: 'center' }}>
      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4, position: 'relative' }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: 'linear-gradient(90deg,#c084fc,#f472b6)', borderRadius: 4, boxShadow: '0 0 8px rgba(240,100,180,0.5)', transition: 'width 2s linear', position: 'relative' }}>
          <div style={{ position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#f9a8d4', boxShadow: '0 0 8px rgba(249,168,212,0.8)' }} />
        </div>
      </div>
    </div>
  )
}

function MobileSessionModal({ onDisconnect }: { onDisconnect: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ textAlign: 'center', marginTop: -4, position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.04em', fontFamily: "'Courier New', monospace", minHeight: 36, padding: '6px 12px', transition: 'color 0.2s' }}>⚙ session</button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.18 }} style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: 'rgba(8,2,18,0.97)', border: '1px solid rgba(200,130,255,0.2)', borderRadius: 12, padding: '12px 16px', width: 200, boxShadow: '0 4px 24px rgba(0,0,0,0.6)', zIndex: 110 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>Connected via Spotify</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setOpen(false)} style={{ padding: '6px 10px', borderRadius: 8, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: 12, minHeight: 36 }}>keep</button>
              <button onClick={onDisconnect} style={{ padding: '6px 10px', borderRadius: 8, cursor: 'pointer', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(200,130,255,0.2)', color: 'rgba(200,130,255,0.8)', fontSize: 12, minHeight: 36 }}>disconnect</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CtrlBtn({ children, large, onClick }: { children: React.ReactNode; large?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 44, height: 44, background: large ? 'rgba(168,85,247,0.2)' : 'none', border: large ? '1px solid rgba(200,130,255,0.25)' : 'none', borderRadius: '50%', color: 'rgba(220,180,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s, transform 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.color = 'rgba(249,168,212,1)'; e.currentTarget.style.transform = 'scale(1.15)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(220,180,255,0.7)'; e.currentTarget.style.transform = 'scale(1)' }}
    >{children}</button>
  )
}

function PlayPauseIcon({ playing, size }: { playing: boolean; size: number }) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {playing
        ? <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size * 0.42, height: size * 0.42 }}><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        : <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size * 0.42, height: size * 0.42 }}><polygon points="5,3 19,12 5,21" /></svg>
      }
    </div>
  )
}
function PrevIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}><polygon points="19,20 9,12 19,4" /><rect x="5" y="4" width="3" height="16" /></svg> }
function NextIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}><polygon points="5,4 15,12 5,20" /><rect x="16" y="4" width="3" height="16" /></svg> }
function SpotifyLogo({ size }: { size: number }) {
  return <svg viewBox="0 0 24 24" fill="rgba(200,150,255,0.7)" style={{ width: size, height: size, flexShrink: 0 }}><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
}
