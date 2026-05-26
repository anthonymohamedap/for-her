'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface BloomBurstProps {
  trigger: boolean
}

const PETAL_COLORS = ['#C084FC', '#F472B6', '#FFF8F0', '#a855f7', '#fde68a', '#818cf8']

export default function BloomBurst({ trigger }: BloomBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>()

  useEffect(() => {
    if (!trigger) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const cx = canvas.width / 2
    const cy = canvas.height / 2

    const petals: {
      x: number; y: number; vx: number; vy: number
      size: number; color: string; opacity: number; rotation: number; vr: number
    }[] = []

    // Spawn 80 petals
    for (let i = 0; i < 80; i++) {
      const angle = (Math.random() * Math.PI * 2)
      const speed = 2 + Math.random() * 8
      petals.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 4 + Math.random() * 10,
        color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
        opacity: 1,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
      })
    }

    let frame = 0

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let alive = 0
      for (const p of petals) {
        if (p.opacity <= 0) continue
        alive++
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.12  // gravity
        p.vx *= 0.99
        p.rotation += p.vr
        p.opacity -= 0.008

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.ellipse(0, 0, p.size / 2, p.size, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      frame++
      if (alive > 0 && frame < 300) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current!)
  }, [trigger])

  if (!trigger) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50"
        style={{ width: '100vw', height: '100vh' }}
      />
      <motion.div
        className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, times: [0, 0.2, 1] }}
      >
        <motion.p
          className="font-cormorant text-5xl text-garden-ivory text-center"
          style={{ textShadow: '0 0 40px rgba(192,132,252,0.8)' }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          🌸
        </motion.p>
      </motion.div>
    </>
  )
}
