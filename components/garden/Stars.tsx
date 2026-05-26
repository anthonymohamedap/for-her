'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  twinkleDuration: number
  delay: number
}

export default function Stars() {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    setStars(
      Array.from({ length: 55 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 50,
        size: Math.random() * 1.4 + 0.4,
        opacity: Math.random() * 0.5 + 0.2,
        twinkleDuration: Math.random() * 3 + 2,
        delay: Math.random() * 4,
      }))
    )
  }, [])

  return (
    <div
      className="absolute inset-0 pointer-events-none hidden md:block"
      style={{ zIndex: 0 }}
    >
      {stars.map((star, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{ opacity: [star.opacity, star.opacity * 0.2, star.opacity] }}
          transition={{
            duration: star.twinkleDuration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: star.delay,
          }}
        />
      ))}
    </div>
  )
}
