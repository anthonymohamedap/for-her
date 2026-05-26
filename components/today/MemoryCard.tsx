'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { Memory } from '@/lib/supabase'
import { getDisplayName } from '@/lib/identity'

interface MemoryCardProps {
  memories: Memory[]
  date: string
  index: number
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    timeZone: 'UTC',
  })
}

function Polaroid({ memory, rotation }: { memory: Memory; rotation: number }) {
  return (
    <motion.div
      className="polaroid rounded-lg p-3 pb-8 relative"
      style={{ rotate: rotation, minWidth: 160, maxWidth: 200 }}
      whileHover={{ scale: 1.05, rotate: 0, y: -8, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Photo */}
      <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-gray-900" style={{ minHeight: 150 }}>
        <Image
          src={memory.photo_url}
          alt={`${getDisplayName(memory.identity)}'s photo`}
          fill
          className="object-cover"
          sizes="200px"
        />
        {/* Subtle glow overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: memory.identity === 'anthony'
              ? 'linear-gradient(135deg, rgba(192,132,252,0.1) 0%, transparent 60%)'
              : 'linear-gradient(135deg, rgba(244,114,182,0.1) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Caption area */}
      <div className="mt-2 px-1">
        <p className="font-caveat text-xs text-white/50 mb-1">
          {getDisplayName(memory.identity)} ✦
        </p>
        {memory.caption && (
          <p className="font-caveat text-sm text-garden-ivory/80 leading-tight">
            "{memory.caption}"
          </p>
        )}
      </div>
    </motion.div>
  )
}

export default function MemoryCard({ memories, date, index }: MemoryCardProps) {
  const anthonyMem = memories.find(m => m.identity === 'anthony')
  const yeonMem = memories.find(m => m.identity === 'yeon')
  const rot1 = ((index * 37) % 5) - 2  // -2 to +3
  const rot2 = -(((index * 53) % 5) - 1)

  return (
    <motion.div
      className="mb-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.6 }}
    >
      {/* Date label */}
      <p className="font-caveat text-center text-white/30 text-sm mb-4">
        {formatDate(date)}
      </p>

      {/* Photos */}
      <div className="flex justify-center gap-6 flex-wrap">
        {anthonyMem && <Polaroid memory={anthonyMem} rotation={rot1} />}
        {yeonMem && <Polaroid memory={yeonMem} rotation={rot2} />}

        {/* Placeholder for missing upload */}
        {!anthonyMem && (
          <div className="polaroid rounded-lg p-3 pb-8 opacity-30" style={{ minWidth: 160, maxWidth: 200 }}>
            <div className="aspect-square w-full rounded-sm bg-gray-900/50 border border-white/5 flex items-center justify-center" style={{ minHeight: 150 }}>
              <p className="font-caveat text-white/30 text-xs text-center px-2">Anthony's photo</p>
            </div>
          </div>
        )}
        {!yeonMem && (
          <div className="polaroid rounded-lg p-3 pb-8 opacity-30" style={{ minWidth: 160, maxWidth: 200 }}>
            <div className="aspect-square w-full rounded-sm bg-gray-900/50 border border-white/5 flex items-center justify-center" style={{ minHeight: 150 }}>
              <p className="font-caveat text-white/30 text-xs text-center px-2">Yeon's photo</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
