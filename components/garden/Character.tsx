'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

interface CharacterProps {
  src: string
  alt: string
  heightVh?: number
  widthVw?: number
  floatDelay?: number
  entranceDelay?: number
  entranceFrom?: 'left' | 'right'
  breatheDuration?: number
}

export default function Character({
  src,
  alt,
  heightVh = 28,
  widthVw = 24,
  floatDelay = 0,
  entranceDelay = 4.0,
  entranceFrom = 'left',
  breatheDuration = 4.2,
}: CharacterProps) {
  const size = { height: `${heightVh}vh`, width: `${widthVw}vw` }

  return (
    <motion.div
      style={{ ...size, position: 'relative' }}
      initial={{ x: entranceFrom === 'left' ? -240 : 240, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{
        delay: entranceDelay,
        duration: 1.4,
        type: 'spring',
        stiffness: 60,
        damping: 14,
      }}
    >
      {/* Ground glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          height: '20%',
          background:
            'radial-gradient(ellipse, rgba(192,132,252,0.14) 0%, transparent 70%)',
        }}
      />

      {/* Breathing + float */}
      <motion.div
        animate={{
          y: [0, -6, 0],
          scaleY: [1, 1.008, 1],
        }}
        transition={{
          duration: breatheDuration,
          delay: floatDelay,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          ...size,
          position: 'relative',
          transformOrigin: 'bottom center',
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain object-bottom"
          sizes={`(max-width: 768px) 35vw, ${widthVw}vw`}
          priority
        />
      </motion.div>
    </motion.div>
  )
}
