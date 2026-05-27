'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import Image from 'next/image'

interface Petal {
  id: number
  vx: number
  vy: number
}

interface GermanShepherdProps {
  size?: number
}

export default function GermanShepherd({ size = 160 }: GermanShepherdProps) {
  const [glancing, setGlancing]   = useState(false)
  const [petals, setPetals]       = useState<Petal[]>([])
  const [tapping, setTapping]     = useState(false)
  const controls  = useAnimationControls()
  const petalId   = useRef(0)
  const glanceRef = useRef<ReturnType<typeof setTimeout>>()

  // Idle glance toward schnauzer (to the left) every 8–12s
  useEffect(() => {
    function scheduleGlance() {
      glanceRef.current = setTimeout(() => {
        setGlancing(true)
        setTimeout(() => {
          setGlancing(false)
          scheduleGlance()
        }, 800)
      }, 8000 + Math.random() * 4000)
    }
    const init = setTimeout(scheduleGlance, 5000)
    return () => {
      clearTimeout(init)
      clearTimeout(glanceRef.current)
    }
  }, [])

  function handleClick() {
    if (tapping) return
    setTapping(true)

    // Happy bounce via controls
    controls.start({
      y: [0, -18, 0, -10, 0, -5, 0],
      transition: { duration: 0.6, ease: 'easeInOut' },
    }).then(() => setTapping(false))

    // Lily petal burst — white and soft pink
    const burst: Petal[] = Array.from({ length: 12 }, (_, i) => ({
      id: petalId.current++,
      vx: (Math.random() - 0.5) * 10,
      vy: -(Math.random() * 6 + 3),
    }))
    setPetals(burst)
    setTimeout(() => setPetals([]), 1600)
  }

  // Sway direction: shepherd is to the RIGHT of schnauzer, so glance rotates LEFT (negative)
  const glanceRotate = glancing ? -10 : 0

  return (
    <motion.div
      className="relative cursor-pointer select-none"
      style={{ width: size, height: size }}
      // Entrance from the right
      initial={{ x: 200, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 3.7, duration: 1.4, type: 'spring', stiffness: 75, damping: 14 }}
      onClick={handleClick}
    >
      {/* Float bob — 3.6s, different from schnauzer's 3.5s */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      >
        {/* Sway */}
        <motion.div
          animate={{ rotate: [-1.2, 1.2, -1.2] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: 'bottom center' }}
        >
          {/* Glance — rotates toward schnauzer (left) */}
          <motion.div
            animate={{ rotate: glanceRotate }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            style={{ transformOrigin: 'bottom center' }}
          >
            <motion.div animate={controls} style={{ transformOrigin: 'bottom center' }}>
              {/* Ambient glow */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(192,132,252,0.14) 0%, transparent 70%)',
                  transform: 'scale(1.4)',
                }}
              />
              <div style={{ width: size, height: size, position: 'relative' }}>
                <Image
                  src="/images/German_Shepered.png"
                  alt="german shepherd"
                  fill
                  className="object-contain object-bottom"
                  sizes={`${size}px`}
                  priority
                />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Lily petal burst — white + blush pink */}
      <AnimatePresence>
        {petals.map(p => (
          <motion.div
            key={p.id}
            className="absolute pointer-events-none"
            style={{
              width: 8, height: 5,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              background: p.id % 3 === 0 ? '#fff8f8' : p.id % 3 === 1 ? '#fce7f3' : '#f9d5e5',
              left: '50%', top: '30%',
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
            animate={{
              x: p.vx * 32,
              y: p.vy * 30,
              opacity: 0,
              scale: 0.4,
              rotate: Math.random() * 360,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
