'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

import { getIdentity, getPartnerIdentity } from '@/lib/identity'
import { sendPushNotification } from '@/lib/push'
import { getMemoriesForDate, getAllMemories } from '@/lib/supabase'
import { getTodayUTC, computeStreak } from '@/lib/streak'
import type { Identity, Memory } from '@/lib/supabase'
import UploadCard from '@/components/today/UploadCard'
import MemoryCard from '@/components/today/MemoryCard'
import WaitingDog from '@/components/today/WaitingDog'
import BloomBurst from '@/components/today/BloomBurst'
import StreakCounter from '@/components/today/StreakCounter'

type TodayState = 'loading' | 'upload' | 'waiting' | 'both'

// Small floating dog that lives at top of /today always
function DogCorner() {
  return (
    <motion.div
      className="flex flex-col items-center mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.8 }}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'relative', width: 100, height: 100 }}
      >
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(192,132,252,0.18) 0%, transparent 70%)',
            transform: 'scale(1.6)',
          }}
        />
        <Image
          src="/images/schnauzer.png"
          alt="schnauzer"
          fill
          className="object-contain"
          sizes="100px"
        />
      </motion.div>
    </motion.div>
  )
}

export default function TodayPage() {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [todayMemories, setTodayMemories] = useState<Memory[]>([])
  const [allMemories, setAllMemories] = useState<Memory[]>([])
  const [todayState, setTodayState] = useState<TodayState>('loading')
  const [bloomBurst, setBloomBurst] = useState(false)
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, totalSharedDays: 0 })
  const today = getTodayUTC()

  const load = useCallback(async () => {
    const id = getIdentity()
    if (!id) return
    setIdentity(id)

    const [todayMems, allMems] = await Promise.all([
      getMemoriesForDate(today),
      getAllMemories(),
    ])

    setTodayMemories(todayMems)
    setAllMemories(allMems)
    setStreak(computeStreak(allMems))

    const myUpload = todayMems.find(m => m.identity === id)
    const partnerUpload = todayMems.find(m => m.identity !== id)

    if (!myUpload) setTodayState('upload')
    else if (!partnerUpload) setTodayState('waiting')
    else setTodayState('both')
  }, [today])

  useEffect(() => { load() }, [load])

  async function handleUploaded() {
    // Notify the other person
    if (identity) sendPushNotification(identity)

    const todayMems = await getMemoriesForDate(today)
    setTodayMemories(todayMems)
    const partnerUpload = todayMems.find(m => m.identity !== identity)
    if (partnerUpload) {
      setTodayState('both')
      setBloomBurst(true)
      setTimeout(() => setBloomBurst(false), 3500)
    } else {
      setTodayState('waiting')
    }
    const allMems = await getAllMemories()
    setAllMemories(allMems)
    setStreak(computeStreak(allMems))
  }

  const pastMemoriesByDate: Record<string, Memory[]> = {}
  for (const m of allMemories) {
    if (m.date === today) continue
    if (!pastMemoriesByDate[m.date]) pastMemoriesByDate[m.date] = []
    pastMemoriesByDate[m.date].push(m)
  }
  const pastDates = Object.keys(pastMemoriesByDate).sort((a, b) => b.localeCompare(a))

  if (todayState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="font-caveat text-white/40 text-base"
        >
          Growing...
        </motion.div>
      </div>
    )
  }

  return (
    <main className="min-h-screen pt-20 pb-16 px-4 md:px-8 ambient-glow">
      <BloomBurst trigger={bloomBurst} />

      <div className="max-w-2xl mx-auto">
        {/* Streak */}
        <StreakCounter streak={streak.currentStreak} totalDays={streak.totalSharedDays} />

        {/* Today section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-14"
        >
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="h-px flex-1 bg-white/8" />
            <p className="font-caveat text-white/30 text-sm">today</p>
            <div className="h-px flex-1 bg-white/8" />
          </div>

          {/* Upload state — dog + upload card */}
          {todayState === 'upload' && identity && (
            <div>
              <DogCorner />
              <UploadCard identity={identity} date={today} onUploaded={handleUploaded} />
            </div>
          )}

          {/* Waiting state — my photo + waiting dog */}
          {todayState === 'waiting' && identity && (
            <>
              {todayMemories.length > 0 && (
                <div className="mb-4">
                  <MemoryCard memories={todayMemories} date={today} index={-1} />
                </div>
              )}
              <WaitingDog waitingFor={getPartnerIdentity(identity)} />
            </>
          )}

          {/* Both uploaded — bloom + both photos */}
          {todayState === 'both' && (
            <>
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-caveat text-center text-garden-purple text-base mb-6"
                style={{ textShadow: '0 0 20px rgba(192,132,252,0.4)' }}
              >
                Both here today ✦
              </motion.p>
              <MemoryCard memories={todayMemories} date={today} index={-1} />
            </>
          )}
        </motion.div>

        {/* Past memories timeline */}
        {pastDates.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-10 justify-center">
              <div className="h-px flex-1 bg-white/8" />
              <p className="font-caveat text-white/25 text-sm">memories</p>
              <div className="h-px flex-1 bg-white/8" />
            </div>

            {pastDates.map((date, i) => (
              <MemoryCard
                key={date}
                memories={pastMemoriesByDate[date]}
                date={date}
                index={i}
              />
            ))}
          </motion.div>
        )}

        {pastDates.length === 0 && todayState !== 'upload' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="font-caveat text-center text-white/20 text-sm mt-8"
          >
            Your shared memories will grow here, one day at a time.
          </motion.p>
        )}
      </div>
    </main>
  )
}
