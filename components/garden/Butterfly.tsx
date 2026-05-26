'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

// Desktop-specific per-butterfly configs (size, y-range, initial position)
const DESKTOP_CFG = [
  { size: 52, yMin: 0.30, yMax: 0.55, initXPct: 0.08, initYPct: 0.30 },
  { size: 38, yMin: 0.18, yMax: 0.38, initXPct: 0.22, initYPct: 0.26 },
  { size: 44, yMin: 0.06, yMax: 0.20, initXPct: 0.45, initYPct: 0.10 },
  { size: 60, yMin: 0.22, yMax: 0.48, initXPct: 0.68, initYPct: 0.22 },
  { size: 34, yMin: 0.10, yMax: 0.32, initXPct: 0.82, initYPct: 0.32 },
]

// Mobile depth-tier config by index
const MOBILE_CFG = [
  { size: 58, yMin: 0.40, yMax: 0.68 },
  { size: 42, yMin: 0.30, yMax: 0.58 },
  { size: 28, yMin: 0.18, yMax: 0.42 },
  { size: 52, yMin: 0.35, yMax: 0.62 },
  { size: 32, yMin: 0.22, yMax: 0.48 },
]

interface ButterflyProps {
  index: number
  gardenLevel?: number
  isDesktop?: boolean
}

export default function Butterfly({ index, gardenLevel = 0, isDesktop = false }: ButterflyProps) {
  const cfg = isDesktop
    ? DESKTOP_CFG[index % DESKTOP_CFG.length]
    : MOBILE_CFG[index % MOBILE_CFG.length]

  const size = cfg.size
  // Opacity reflects depth: bigger = closer = more opaque
  const baseOpacity = size >= 55 ? 0.9 : size >= 44 ? 0.75 : 0.55
  // Blur on distant (small) butterflies
  const blurFilter = size <= 36 ? 'blur(0.8px)' : undefined

  const [pos, setPos] = useState({ x: 400, y: 200 })
  const [target, setTarget] = useState({ x: 400, y: 200 })
  const [flipped, setFlipped] = useState(false)
  const posRef = useRef(pos)
  const rafRef = useRef<number>()

  // Constrained idle wander within tier Y-range
  useEffect(() => {
    function wander() {
      const w = window.innerWidth
      const h = window.innerHeight
      setTarget({
        x: 80 + Math.random() * (w - 160),
        y: h * cfg.yMin + Math.random() * h * (cfg.yMax - cfg.yMin),
      })
    }

    // Set initial position on mount
    const h = window.innerHeight
    const w = window.innerWidth
    if (isDesktop) {
      const dc = cfg as typeof DESKTOP_CFG[0]
      setPos({ x: dc.initXPct * w, y: dc.initYPct * h })
      posRef.current = { x: dc.initXPct * w, y: dc.initYPct * h }
    }

    const id = setInterval(wander, 2800 + Math.random() * 2200)
    wander()
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop])

  // Gentle cursor blend (30%)
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      setTarget(prev => ({
        x: prev.x * 0.72 + e.clientX * 0.28,
        y: prev.y * 0.72 + e.clientY * 0.28,
      }))
    }
    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [])

  // Smooth lerp toward target
  useEffect(() => {
    function loop() {
      posRef.current = {
        x: posRef.current.x + (target.x - posRef.current.x) * 0.025,
        y: posRef.current.y + (target.y - posRef.current.y) * 0.025,
      }
      const dx = target.x - posRef.current.x
      if (Math.abs(dx) > 5) setFlipped(dx < 0)
      setPos({ ...posRef.current })
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current!)
  }, [target])

  return (
    <motion.div
      className="absolute pointer-events-none will-change-transform z-20"
      style={{ left: pos.x, top: pos.y, translateX: '-50%', translateY: '-50%' }}
    >
      <motion.div style={{ scaleX: flipped ? -1 : 1 }} transition={{ duration: 0.2 }}>
        <motion.div
          animate={{ scaleY: [1, 0.75, 1], scaleX: [1, 1.05, 1] }}
          transition={{
            duration: 0.38,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.13,
          }}
          style={{
            mixBlendMode: 'screen',
            opacity: baseOpacity,
            filter: blurFilter,
            width: size,
            height: size,
            position: 'relative',
          }}
        >
          <Image
            src="/images/butterfly.png"
            alt="butterfly"
            fill
            className="object-contain"
            sizes={`${size}px`}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
