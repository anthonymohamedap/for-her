'use client'

import { motion, useAnimationControls } from 'framer-motion'

interface FireflyProps {
  index: number
}

export default function Firefly({ index }: FireflyProps) {
  const seed = index * 137.508

  // Spread across full viewport — 5% to 85% vertically, 3% to 97% horizontally
  const startX = (seed * 71) % 94 + 3
  const startY = (seed * 53) % 80 + 5

  const size = 2.5 + (seed % 2)
  const moveDuration = 6 + (index % 5) * 1.4
  const delay = index * 0.38
  // Irregular pulse durations: 1.8s to 3.4s
  const pulseDuration = 1.8 + ((index * 0.27) % 1.6)

  const waypoints = {
    x: [
      `${startX}vw`,
      `${startX + Math.sin(seed) * 14}vw`,
      `${startX + Math.cos(seed * 2) * 11}vw`,
      `${startX + Math.sin(seed * 3) * 9}vw`,
      `${startX}vw`,
    ],
    y: [
      `${startY}vh`,
      `${startY - 7}vh`,
      `${startY - 13}vh`,
      `${startY - 5}vh`,
      `${startY}vh`,
    ],
  }

  return (
    <motion.div
      className="absolute will-change-transform pointer-events-none"
      style={{ left: `${startX}vw`, top: `${startY}vh`, zIndex: 5 }}
      animate={waypoints}
      transition={{
        duration: moveDuration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
        repeatType: 'reverse',
      }}
    >
      {/* Glowing core with animated box-shadow */}
      <motion.div
        className="rounded-full"
        style={{ width: size, height: size, background: '#fffbe6' }}
        animate={{
          opacity: [0, 1, 0.2, 0.9, 0],
          scale: [0.8, 1.5, 0.9, 1.3, 0.8],
          boxShadow: [
            `0 0 3px 1px rgba(255,240,150,0.4)`,
            `0 0 8px 4px rgba(255,240,150,0.95)`,
            `0 0 2px 1px rgba(255,240,150,0.2)`,
            `0 0 6px 3px rgba(255,240,150,0.75)`,
            `0 0 3px 1px rgba(255,240,150,0.4)`,
          ],
        }}
        transition={{
          duration: pulseDuration,
          delay: delay * 0.35,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Soft outer corona */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 7,
          height: size * 7,
          left: -(size * 3),
          top: -(size * 3),
          background: `radial-gradient(circle, rgba(255,248,220,0.28) 0%, rgba(192,132,252,0.1) 45%, transparent 70%)`,
        }}
      />
    </motion.div>
  )
}
