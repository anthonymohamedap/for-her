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

function fmt(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const CHECKER = [
  'linear-gradient(45deg,#f2c4d8 25%,transparent 25%)',
  'linear-gradient(-45deg,#f2c4d8 25%,transparent 25%)',
  'linear-gradient(45deg,transparent 75%,#f2c4d8 75%)',
  'linear-gradient(-45deg,transparent 75%,#f2c4d8 75%)',
].join(',')

export default function SpotifyWidget() {
  const [connected, setConnected] = useState(false)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [loading, setLoading] = useState(true)
  const wasPlayingRef = useRef(false)
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  const disconnect = useCallback(() => {
    clearTokens()
    setConnected(false)
  }, [])

  useEffect(() => {
    setConnected(!!loadTokens())
    setLoading(false)
  }, [])

  const poll = useCallback(async () => {
    const result = await getNowPlaying()
    if (!result) return
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
  const progress = nowPlaying && nowPlaying.durationMs > 0
    ? nowPlaying.progressMs / nowPlaying.durationMs : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 4.2, duration: 1.4, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: '5vh',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 186,
        zIndex: 50,
        fontFamily: '"Courier New", monospace',
      }}
    >
      <div style={{
        background: '#ede8d5',
        border: '2px solid #111',
        boxShadow: '3px 3px 0 #111',
      }}>

        {/* ── Title bar ── */}
        <div style={{
          background: 'linear-gradient(90deg,#d4437a,#f06ba0)',
          borderBottom: '2px solid #111',
          padding: '3px 5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}>
          <span style={{ fontSize: 10, color: '#fff', fontWeight: 700, letterSpacing: 0.5 }}>
            Audio Player
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            <WinBtn label="_" />
            <WinBtn label="□" />
            <WinBtn label="×" onClick={disconnect} />
          </div>
        </div>

        {/* ── Album art ── */}
        <div style={{ padding: '7px 7px 4px' }}>
          <div style={{
            width: '100%', aspectRatio: '1',
            border: '2px solid #111',
            position: 'relative', overflow: 'hidden',
          }}>
            {!nowPlaying?.albumArt && (
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: CHECKER,
                backgroundSize: '18px 18px',
                backgroundPosition: '0 0,0 9px,9px -9px,-9px 0',
                backgroundColor: '#fff',
              }} />
            )}
            {nowPlaying?.albumArt && (
              <Image
                src={nowPlaying.albumArt}
                alt="album art"
                fill
                className="object-cover"
                sizes="172px"
                unoptimized
              />
            )}
            <AnimatePresence>
              {!connected && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={startLogin}
                  style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(237,232,213,0.9)',
                    cursor: 'pointer', border: 'none', gap: 5,
                  }}
                >
                  <SpotifyLogo />
                  <span style={{ fontSize: 9, color: '#111', fontWeight: 700, letterSpacing: 1 }}>
                    CONNECT
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Track info ── */}
        <div style={{ padding: '0 7px 3px', minHeight: 30 }}>
          <AnimatePresence mode="wait">
            {isPlaying && nowPlaying ? (
              <motion.div
                key={nowPlaying.title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <p style={{
                  fontSize: 10, fontWeight: 700, color: '#111',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  margin: 0, lineHeight: 1.5,
                }}>
                  {nowPlaying.title}
                </p>
                <p style={{
                  fontSize: 9, color: '#555', margin: 0, lineHeight: 1.4,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {nowPlaying.artist}
                </p>
              </motion.div>
            ) : (
              <motion.p
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: 9, color: '#999', margin: 0, lineHeight: 3 }}
              >
                {connected ? 'nothing playing…' : ''}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* ── Transport controls ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 14, padding: '3px 7px 4px',
        }}>
          <svg viewBox="0 0 24 24" fill="#111" style={{ width: 15, height: 15, opacity: connected ? 0.85 : 0.25 }}>
            <polygon points="19,20 9,12 19,4" /><rect x="5" y="4" width="3" height="16" />
          </svg>
          <div style={{
            width: 24, height: 24, background: '#111', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: connected ? 1 : 0.25,
          }}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="white" style={{ width: 10, height: 10 }}>
                <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="white" style={{ width: 10, height: 10 }}>
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </div>
          <svg viewBox="0 0 24 24" fill="#111" style={{ width: 15, height: 15, opacity: connected ? 0.85 : 0.25 }}>
            <polygon points="5,4 15,12 5,20" /><rect x="16" y="4" width="3" height="16" />
          </svg>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ padding: '1px 7px 3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 8, color: '#666', minWidth: 22 }}>
              {isPlaying ? fmt(nowPlaying!.progressMs) : '0:00'}
            </span>
            <div style={{ flex: 1, height: 5, background: '#ccc', border: '1.5px solid #999', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${progress * 100}%`, background: '#111',
                transition: 'width 2s linear',
              }} />
              <div style={{
                position: 'absolute', top: '50%',
                left: `${progress * 100}%`,
                transform: 'translate(-50%,-50%)',
                width: 9, height: 9,
                background: '#ede8d5', border: '1.5px solid #111', borderRadius: '50%',
              }} />
            </div>
          </div>
        </div>

        {/* ── Volume bar ── */}
        <div style={{ padding: '1px 7px 7px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5"
              style={{ width: 10, height: 10, flexShrink: 0 }}>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
            <div style={{ flex: 1, height: 5, background: '#111', border: '1.5px solid #999', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '41%', background: '#ede8d5' }} />
              <div style={{
                position: 'absolute', top: '50%', left: '41%',
                transform: 'translate(-50%,-50%)',
                width: 7, height: 11, background: '#ede8d5', border: '1.5px solid #111',
              }} />
            </div>
            <span style={{ fontSize: 8, color: '#666', minWidth: 22, textAlign: 'right' }}>41%</span>
          </div>
        </div>

        {/* ── Our playlist ── */}
        {connected && PLAYLIST_URL && (
          <a href={PLAYLIST_URL} target="_blank" rel="noopener noreferrer" style={{
            display: 'block', borderTop: '2px solid #111',
            padding: '4px 7px', fontSize: 9, color: '#d4437a',
            textAlign: 'center', fontWeight: 700, letterSpacing: 0.8, textDecoration: 'none',
          }}>
            ♪ our playlist ♪
          </a>
        )}
      </div>
    </motion.div>
  )
}

function WinBtn({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 9, width: 14, height: 13,
        background: '#ede8d5', border: '1.5px solid #111',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, color: '#111', padding: 0, lineHeight: 1,
        boxShadow: 'inset -1px -1px 0 rgba(0,0,0,0.15),inset 1px 1px 0 rgba(255,255,255,0.6)',
      }}
    >
      {label}
    </button>
  )
}

function SpotifyLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="#d4437a" style={{ width: 26, height: 26 }}>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}
