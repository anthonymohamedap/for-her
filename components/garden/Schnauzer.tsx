'use client'

import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import Image from 'next/image'
import { playSound, stopSound } from '@/components/ui/AudioToggle'

type DogState = 'idle' | 'spin' | 'sneeze' | 'sleep' | 'bark'

interface Petal {
  id: number
  vx: number
  vy: number
  color: string
}

interface SchnauzerProps {
  size?: number
}

export default function Schnauzer({ size = 160 }: SchnauzerProps) {
  const [state, setState] = useState<DogState>('idle')
  const [zzz, setZzz] = useState(false)
  const [petals, setPetals] = useState<Petal[]>([])
  const stateRef = useRef<DogState>('idle')
  const controls = useAnimationControls()
  const petalId = useRef(0)

  const triggerAction = useCallback(async () => {
    if (stateRef.current !== 'idle') return
    const actions: DogState[] = ['spin', 'sneeze', 'sleep', 'bark']
    const action = actions[Math.floor(Math.random() * actions.length)]
    stateRef.current = action
    setState(action)

    if (action === 'spin') {
      playSound('squeak')
      await controls.start({ rotate: [0, 360], transition: { duration: 0.65, ease: 'easeInOut' } })
      controls.set({ rotate: 0 })
    } else if (action === 'sneeze') {
      playSound('sneeze')
      await controls.start({ x: [-3, 3, -3, 3, 0], transition: { duration: 0.35 } })
      const newPetals: Petal[] = Array.from({ length: 20 }, (_, i) => ({
        id: petalId.current++,
        vx: (Math.random() - 0.5) * 10,
        vy: -(Math.random() * 6 + 2),
        color: ['#C084FC', '#F472B6', '#FFF8F0', '#a855f7', '#fde68a'][i % 5],
      }))
      setPetals(newPetals)
      setTimeout(() => setPetals([]), 1600)
    } else if (action === 'sleep') {
      playSound('snore')
      setZzz(true)
      await new Promise(r => setTimeout(r, 4000))
      setZzz(false)
      stopSound('snore')
    } else if (action === 'bark') {
      playSound('bark')
      await controls.start({ y: [0, -10, 0, -5, 0], transition: { duration: 0.4 } })
    }

    stateRef.current = 'idle'
    setState('idle')
  }, [controls])

  return (
    <motion.div
      className="relative cursor-pointer select-none"
      style={{ width: size, height: size }}
      initial={{ x: -220, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 3.5, duration: 1.4, type: 'spring', stiffness: 75, damping: 14 }}
      onClick={triggerAction}
    >
      <motion.div
        animate={state === 'sleep' ? { y: 6, rotate: -8 } : { y: [0, -5, 0] }}
        transition={
          state === 'sleep'
            ? { duration: 0.4 }
            : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <motion.div animate={controls}>
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(192,132,252,0.18) 0%, transparent 70%)',
              transform: 'scale(1.4)',
            }}
          />
          <div style={{ width: size, height: size, position: 'relative' }}>
            <Image
              src="/images/schnauzer.png"
              alt="schnauzer"
              fill
              className="object-contain"
              sizes={`${size}px`}
              priority
            />
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {zzz &&
          [0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="absolute font-caveat text-white/50 pointer-events-none"
              style={{ right: -8 + i * 6, top: 10 - i * 16, fontSize: 10 + i * 3 }}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 0.8, 0], y: -40 - i * 14 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, delay: i * 0.65, repeat: Infinity }}
            >
              z
            </motion.span>
          ))}
      </AnimatePresence>

      <AnimatePresence>
        {petals.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{ width: 7, height: 7, background: p.color, left: '50%', top: '35%' }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: p.vx * 35,
              y: p.vy * 35,
              opacity: 0,
              scale: 0.3,
              rotate: Math.random() * 360,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.3, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
