'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import OpeningSequence from '@/components/garden/OpeningSequence'
import Tulip from '@/components/garden/Tulip'
import Butterfly from '@/components/garden/Butterfly'
import Firefly from '@/components/garden/Firefly'
import FloatingMessage from '@/components/garden/FloatingMessage'
import Schnauzer from '@/components/garden/Schnauzer'
import GermanShepherd from '@/components/garden/GermanShepherd'
import Character from '@/components/garden/Character'
import Grass from '@/components/garden/Grass'
import Stars from '@/components/garden/Stars'
import Moon from '@/components/garden/Moon'
import SpotifyWidget from '@/components/garden/SpotifyWidget'
import { getAllMemories } from '@/lib/supabase'
import { computeStreak, getGardenLevel } from '@/lib/streak'

// ─── Flower data ────────────────────────────────────────────────────────────
const TULIPS = [
  { x: 4,  y: 28, bloomDelay: 4.2 },
  { x: 12, y: 26, bloomDelay: 4.5 },
  { x: 22, y: 30, bloomDelay: 4.8 },
  { x: 63, y: 27, bloomDelay: 5.1 },
  { x: 74, y: 29, bloomDelay: 5.4 },
  { x: 84, y: 26, bloomDelay: 5.7 },
  { x: 91, y: 28, bloomDelay: 6.0 },
]

const LILIES = [
  { x: 8,  y: 24, bloomDelay: 5.0 },
  { x: 18, y: 22, bloomDelay: 5.3 },
  { x: 32, y: 25, bloomDelay: 5.5 },
  { x: 44, y: 23, bloomDelay: 5.6 },
  { x: 56, y: 24, bloomDelay: 5.8 },
  { x: 70, y: 22, bloomDelay: 6.1 },
  { x: 80, y: 25, bloomDelay: 6.3 },
  { x: 93, y: 23, bloomDelay: 6.5 },
]

const BONUS_TULIPS_L1 = [
  { x: 36, y: 27, bloomDelay: 0.3 },
  { x: 51, y: 29, bloomDelay: 0.5 },
]

const BONUS_TULIPS_L2 = [
  { x: 1,  y: 24, bloomDelay: 0.2 },
  { x: 96, y: 24, bloomDelay: 0.4 },
  { x: 78, y: 32, bloomDelay: 0.6 },
]

// ─── Responsive hook ─────────────────────────────────────────────────────────
function useIsDesktop() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setV(mq.matches)
    const h = (e: MediaQueryListEvent) => setV(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return v
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function GardenPage() {
  const [openingDone, setOpeningDone] = useState(false)
  const [gardenLevel, setGardenLevel] = useState<0 | 1 | 2>(0)
  const isDesktop = useIsDesktop()

  // Dog scales — schnauzer 28/16vh, shepherd 26/18vh
  const [schnauzerScale, setSchnauzerScale] = useState(1.0)
  const [shepherdScale, setShepherdScale]   = useState(1.0)
  useEffect(() => {
    const compute = () => {
      const isMd = window.innerWidth >= 768
      setSchnauzerScale((window.innerHeight * (isMd ? 0.28 : 0.16)) / 160)
      setShepherdScale((window.innerHeight * (isMd ? 0.26 : 0.18)) / 160)
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  useEffect(() => {
    getAllMemories()
      .then(memories => {
        const { currentStreak } = computeStreak(memories)
        setGardenLevel(getGardenLevel(currentStreak))
      })
      .catch(() => {})
  }, [])

  const fireflyCount = gardenLevel === 2 ? 22 : gardenLevel === 1 ? 18 : 14
  const butterflyCount = gardenLevel === 2 ? 5 : gardenLevel === 1 ? 4 : 3

  const allTulips = [
    ...TULIPS,
    ...(gardenLevel >= 1 ? BONUS_TULIPS_L1 : []),
    ...(gardenLevel >= 2 ? BONUS_TULIPS_L2 : []),
  ]

  // Responsive sizing
  const charHeightVh  = isDesktop ? 42 : 28
  const charWidthVw   = isDesktop ? 20 : 28
  const charLeft      = isDesktop ? '18%' : '8%'
  const charRight     = isDesktop ? '18%' : '8%'
  const charBottom    = isDesktop ? '8vh' : '2vh'
  const schnauzerBot  = isDesktop ? '9vh' : '2vh'
  const groundHeight  = isDesktop ? '48%' : '40%'
  const flowerBackVh  = isDesktop ? 10 : 7
  const flowerMidBase = isDesktop ? 18 : 11
  // Scale y positions up on desktop so flowers reach higher in the taller ground container
  const yScale        = isDesktop ? 1.55 : 1.0

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black">
      <AnimatePresence>
        {!openingDone && (
          <OpeningSequence onComplete={() => setOpeningDone(true)} />
        )}
      </AnimatePresence>

      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: openingDone ? 1 : 0 }}
        transition={{ duration: 1.8 }}
      >
        {/* ── Sky / atmosphere ──────────────────────────────────────────── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 0,
            background: `
              radial-gradient(ellipse 80% 60% at 50% -10%, rgba(88,28,135,0.38) 0%, transparent 60%),
              radial-gradient(ellipse 40% 30% at 20% 100%, rgba(168,85,247,0.14) 0%, transparent 50%),
              radial-gradient(ellipse 40% 30% at 80% 100%, rgba(236,72,153,0.09) 0%, transparent 50%),
              radial-gradient(ellipse at 15% 60%, rgba(79,70,229,0.10) 0%, transparent 50%),
              radial-gradient(ellipse at 85% 40%, rgba(192,132,252,0.07) 0%, transparent 45%)
            `,
          }}
        />

        {/* Moonlight column */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60vw',
            height: '80vh',
            background: 'radial-gradient(ellipse at top, rgba(180,160,255,0.08) 0%, transparent 70%)',
            zIndex: 0,
          }}
        />

        {/* ── Stars (desktop only) ───────────────────────────────────────── */}
        <Stars />

        {/* ── Moon + clouds (desktop only) ──────────────────────────────── */}
        <div className="hidden md:block">
          <Moon />
        </div>

        {/* ── Mid-scene atmospheric haze ────────────────────────────────── */}
        {[
          { left: '10%', top: '30%', w: 200, dur: 20, delay: 0 },
          { left: '55%', top: '25%', w: 160, dur: 25, delay: 5 },
          { left: '30%', top: '50%', w: 240, dur: 18, delay: 8 },
          { left: '70%', top: '45%', w: 180, dur: 22, delay: 3 },
          { left: '15%', top: '60%', w: 140, dur: 30, delay: 12 },
        ].map((h, i) => (
          <motion.div
            key={`haze-${i}`}
            className="absolute pointer-events-none"
            style={{
              left: h.left, top: h.top,
              width: h.w, height: h.w * 0.4,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(150,100,220,0.06) 0%, transparent 70%)',
              filter: 'blur(20px)',
              zIndex: 1,
            }}
            animate={{ x: [-15, 15], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: h.dur, delay: h.delay, repeat: Infinity, repeatType: 'reverse' as const, ease: 'easeInOut' }}
          />
        ))}

        {/* ── Fireflies ─────────────────────────────────────────────────── */}
        {Array.from({ length: fireflyCount }, (_, i) => (
          <Firefly key={i} index={i} />
        ))}

        {/* ── Floating messages (max 2) ──────────────────────────────────── */}
        {Array.from({ length: 2 }, (_, i) => (
          <FloatingMessage key={i} index={i} />
        ))}

        {/* ── Butterflies ───────────────────────────────────────────────── */}
        {Array.from({ length: butterflyCount }, (_, i) => (
          <Butterfly key={i} index={i} gardenLevel={gardenLevel} isDesktop={isDesktop} />
        ))}

        {/* ── Ground container ──────────────────────────────────────────── */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ height: groundHeight }}
        >
          <Grass layer={0} />

          {/* BACK layer — lilies, small + blurred */}
          {LILIES.map((lily, i) => (
            <Tulip
              key={`lily-${i}`}
              x={lily.x}
              y={lily.y * yScale}
              heightVh={flowerBackVh + (i % 3)}
              swayDelay={i * 0.35}
              blur={1.5}
              filterSaturate={0.65}
              finalOpacity={0.8}
              zIndex={1}
              variant="lily"
              bloomDelay={openingDone ? 0 : lily.bloomDelay}
            />
          ))}

          {/* MAIN (midground) layer — tulips, full color */}
          {allTulips.map((t, i) => (
            <Tulip
              key={`tulip-${i}`}
              x={t.x}
              y={t.y * yScale}
              heightVh={flowerMidBase + (i % 4)}
              swayDelay={i * 0.28}
              zIndex={2}
              variant="tulip"
              bloomDelay={openingDone ? 0 : t.bloomDelay}
            />
          ))}

          <Grass layer={1} />
          <Grass layer={2} />
        </div>

        {/* Ground glow around character area */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '5%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '55vw',
            height: '22vh',
            background:
              'radial-gradient(ellipse, rgba(255,180,220,0.07) 0%, transparent 70%)',
            zIndex: 3,
          }}
        />

        {/* ── FOREGROUND flowers (desktop only) — large, blurred ─────────── */}
        <motion.div
          className="absolute pointer-events-none hidden md:block"
          style={{
            left: '-2%',
            bottom: 0,
            zIndex: 30,
            filter: 'blur(4px)',
            opacity: 0,
            transformOrigin: 'bottom center',
          }}
          animate={{ opacity: openingDone ? 0.5 : 0 }}
          transition={{ delay: openingDone ? 0 : 6.5, duration: 2 }}
        >
          <motion.div
            style={{ width: '30vh', height: '38vh', position: 'relative', transformOrigin: 'bottom center' }}
            animate={{ rotate: [-1.5, 1.5, -1.5] }}
            transition={{ duration: 3.9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image src="/images/tulip.png" alt="" fill className="object-contain object-bottom" sizes="40vh" />
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute pointer-events-none hidden md:block"
          style={{
            right: '-2%',
            bottom: 0,
            zIndex: 30,
            filter: 'blur(4px)',
            opacity: 0,
            transformOrigin: 'bottom center',
          }}
          animate={{ opacity: openingDone ? 0.5 : 0 }}
          transition={{ delay: openingDone ? 0 : 6.8, duration: 2 }}
        >
          <motion.div
            style={{ width: '30vh', height: '38vh', position: 'relative', transformOrigin: 'bottom center' }}
            animate={{ rotate: [1.5, -1.5, 1.5] }}
            transition={{ duration: 4.3, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          >
            <Image src="/images/lily.png" alt="" fill className="object-contain object-bottom" sizes="40vh" />
          </motion.div>
        </motion.div>

        {/* ── Yeon — left ───────────────────────────────────────────────── */}
        <div
          className="absolute"
          style={{ left: charLeft, bottom: charBottom, zIndex: 10 }}
        >
          <Character
            src="/images/yeon.png"
            alt="Yeon"
            heightVh={charHeightVh}
            widthVw={charWidthVw}
            floatDelay={0.4}
            entranceDelay={3.6}
            entranceFrom="left"
            breatheDuration={4.2}
          />
        </div>

        {/* ── Anthony — right ───────────────────────────────────────────── */}
        <div
          className="absolute"
          style={{ right: charRight, bottom: charBottom, zIndex: 10 }}
        >
          <Character
            src="/images/anthony.png"
            alt="Anthony"
            heightVh={charHeightVh}
            widthVw={charWidthVw}
            floatDelay={0.9}
            entranceDelay={3.8}
            entranceFrom="right"
            breatheDuration={3.8}
          />
        </div>

        {/* ── Dogs — schnauzer centered, shepherd to the right ─────────── */}
        <div
          className="absolute"
          style={{
            left: '50%',
            bottom: schnauzerBot,
            transform: 'translateX(-50%)',
            zIndex: 11,
            display: 'flex',
            alignItems: 'flex-end',
            gap: isDesktop ? '4vw' : '2vw',
          }}
        >
          <div style={{ transform: `scale(${schnauzerScale})`, transformOrigin: 'bottom center' }}>
            <Schnauzer />
          </div>
          <div style={{ transform: `scale(${shepherdScale})`, transformOrigin: 'bottom center' }}>
            <GermanShepherd />
          </div>
        </div>

        {/* ── Ground fade ───────────────────────────────────────────────── */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{
            zIndex: 40,
            background: 'linear-gradient(to top, rgba(5,3,15,0.92) 0%, transparent 100%)',
          }}
        />

        {/* ── Spotify widget ────────────────────────────────────────────── */}
        <SpotifyWidget />
      </motion.div>
    </main>
  )
}
