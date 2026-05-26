'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import Image from 'next/image'

// Desynchronised sway durations — no two flowers share the same timing
const SWAY_DURATIONS = [2.1, 2.7, 3.1, 2.4, 2.9, 3.4, 2.2, 2.6, 3.0, 2.8, 2.3, 3.3]

interface TulipProps {
  x: number
  y: number
  scale?: number
  bloomDelay?: number
  variant?: 'tulip' | 'lily'
  // Layer props
  heightVh?: number
  swayDelay?: number
  blur?: number
  filterSaturate?: number
  finalOpacity?: number
  zIndex?: number
  showGlow?: boolean
}

export default function Tulip({
  x,
  y,
  scale = 1,
  bloomDelay = 0,
  variant = 'tulip',
  heightVh,
  swayDelay = 0,
  blur = 0,
  filterSaturate = 1,
  finalOpacity = 1,
  zIndex = 2,
  showGlow = true,
}: TulipProps) {
  const [hovered, setHovered] = useState(false)

  const swayDuration = SWAY_DURATIONS[Math.abs(Math.round(x)) % SWAY_DURATIONS.length]
  const pixelSize = variant === 'lily' ? 55 * scale : 70 * scale

  const dimStyle = heightVh
    ? { width: `${heightVh}vh`, height: `${heightVh}vh` }
    : { width: pixelSize, height: pixelSize }

  const glowW = heightVh ? `${heightVh * 0.55}vh` : `${pixelSize * 0.55}px`

  const filterParts: string[] = []
  if (blur > 0) filterParts.push(`blur(${blur}px)`)
  if (filterSaturate !== 1) filterParts.push(`saturate(${filterSaturate})`)
  const filterStr = filterParts.length ? filterParts.join(' ') : undefined

  return (
    <div
      className="absolute pointer-events-auto select-none"
      style={{
        left: `${x}%`,
        bottom: `${y}%`,
        zIndex,
        opacity: finalOpacity,
        filter: filterStr,
      }}
    >
      {/* Bloom entrance */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: bloomDelay, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: 'bottom center' }}
      >
        {/* Sway — bends from base */}
        <motion.div
          animate={{ rotate: [-2.5, 2.5, -2.5] }}
          transition={{
            duration: swayDuration,
            delay: swayDelay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ transformOrigin: 'bottom center', position: 'relative' }}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
        >
          {/* Bloom glow halo */}
          {showGlow && (
            <motion.div
              className="absolute pointer-events-none"
              style={{
                bottom: 2,
                left: '50%',
                transform: 'translateX(-50%)',
                width: glowW,
                height: 18,
                background:
                  'radial-gradient(ellipse, rgba(240,100,180,0.38) 0%, transparent 70%)',
              }}
              animate={{ opacity: [0.3, 0.75, 0.3], scaleX: [1, 1.25, 1] }}
              transition={{
                duration: 2.8 + swayDelay * 0.3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: swayDelay,
              }}
            />
          )}

          {/* Hover wrapper */}
          <motion.div
            animate={
              hovered
                ? {
                    scale: 1.15,
                    filter: 'brightness(1.3) drop-shadow(0 0 14px rgba(192,132,252,0.85))',
                  }
                : { scale: 1, filter: 'brightness(1.0)' }
            }
            transition={{ duration: 0.3 }}
            style={{ ...dimStyle, position: 'relative' }}
          >
            <Image
              src={`/images/${variant}.png`}
              alt={variant}
              fill
              className="object-contain object-bottom"
              sizes="(max-width: 768px) 80px, 220px"
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
