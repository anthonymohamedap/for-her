'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

import { getDisplayName } from '@/lib/identity'
import type { Identity } from '@/lib/supabase'

interface WaitingDogProps {
  waitingFor: Identity
}

export default function WaitingDog({ waitingFor }: WaitingDogProps) {
  return (
    <motion.div
      className="flex flex-col items-center py-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Floating schnauzer */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'relative', width: 130, height: 130 }}
      >
        {/* Soft purple glow behind */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(192,132,252,0.2) 0%, transparent 70%)',
            transform: 'scale(1.5)',
          }}
        />
        <Image
          src="/images/schnauzer.png"
          alt="waiting schnauzer"
          fill
          className="object-contain"
          sizes="130px"
        />
      </motion.div>

      {/* Waiting text */}
      <motion.p
        className="font-caveat text-lg text-white/40 mt-5"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        waiting for {getDisplayName(waitingFor)}...
      </motion.p>

      {/* Empty slot pulse */}
      <motion.div
        className="mt-6 rounded-xl"
        style={{
          width: 180,
          height: 220,
          border: '1.5px dashed rgba(192,132,252,0.25)',
          background: 'rgba(192,132,252,0.03)',
        }}
        animate={{
          boxShadow: [
            '0 0 0px rgba(192,132,252,0)',
            '0 0 24px rgba(192,132,252,0.18)',
            '0 0 0px rgba(192,132,252,0)',
          ],
          borderColor: [
            'rgba(192,132,252,0.2)',
            'rgba(192,132,252,0.5)',
            'rgba(192,132,252,0.2)',
          ],
        }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <p className="font-caveat text-white/20 text-sm text-center px-4">
            {getDisplayName(waitingFor)}'s<br />photo will appear here
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
