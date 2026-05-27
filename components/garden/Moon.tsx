'use client'

import { motion } from 'framer-motion'

export default function Moon() {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ top: '6vh', right: '8vw', zIndex: 2 }}
    >
      {/* Ambient glow behind moon */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 120, height: 120,
          background: 'radial-gradient(ellipse, rgba(192,132,252,0.14) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* Drifting cloud 1 — overlaps moon */}
      <motion.div
        animate={{ x: [-20, 40] }}
        transition={{ duration: 35, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
        style={{ position: 'absolute', top: '4px', right: '-10px', pointerEvents: 'none' }}
      >
        <Cloud />
      </motion.div>

      {/* Drifting cloud 2 — below and left */}
      <motion.div
        animate={{ x: [30, -10] }}
        transition={{ duration: 28, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
        style={{ position: 'absolute', top: '50px', right: '50px', opacity: 0.6, pointerEvents: 'none' }}
      >
        <Cloud scale={0.75} />
      </motion.div>

      {/* Moon SVG */}
      <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: 'relative', zIndex: 1 }}>
        <defs>
          <radialGradient id="moonGrad" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#fff8f0" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#e8d5f5" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.6" />
          </radialGradient>
          <filter id="moonGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Outer glow rings */}
        <circle cx="30" cy="30" r="28" fill="rgba(192,132,252,0.05)" />
        <circle cx="30" cy="30" r="22" fill="rgba(192,132,252,0.07)" />
        {/* Moon body */}
        <circle cx="30" cy="30" r="18" fill="url(#moonGrad)" filter="url(#moonGlow)" />
        {/* Craters — very subtle */}
        <circle cx="36" cy="24" r="4" fill="rgba(200,160,240,0.13)" />
        <circle cx="24" cy="34" r="3" fill="rgba(200,160,240,0.09)" />
        <circle cx="34" cy="36" r="2" fill="rgba(200,160,240,0.08)" />
      </svg>

      {/* Moonlight ray */}
      <motion.div
        animate={{ opacity: [0.5, 0.9, 0.4, 0.7, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 54, left: '50%',
          marginLeft: -1,
          width: 2, height: '45vh',
          background: 'linear-gradient(to bottom, rgba(220,190,255,0.09) 0%, rgba(220,190,255,0.03) 50%, transparent 100%)',
          transform: 'rotate(5deg)',
          transformOrigin: 'top center',
          filter: 'blur(3px)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

function Cloud({ scale = 1 }: { scale?: number }) {
  const s = scale
  return (
    <div style={{ position: 'relative', width: 100 * s, height: 40 * s }}>
      <div style={{
        position: 'absolute',
        width: 80 * s, height: 30 * s, top: 0, left: 0,
        borderRadius: '50%',
        background: 'rgba(220,190,255,0.07)',
        filter: 'blur(12px)',
      }} />
      <div style={{
        position: 'absolute',
        width: 60 * s, height: 25 * s, top: -8 * s, left: 25 * s,
        borderRadius: '50%',
        background: 'rgba(220,190,255,0.07)',
        filter: 'blur(10px)',
      }} />
      <div style={{
        position: 'absolute',
        width: 50 * s, height: 20 * s, top: 4 * s, left: 45 * s,
        borderRadius: '50%',
        background: 'rgba(220,190,255,0.07)',
        filter: 'blur(12px)',
      }} />
    </div>
  )
}
