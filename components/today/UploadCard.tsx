'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { uploadPhoto, saveMemory } from '@/lib/supabase'
import { getDisplayName } from '@/lib/identity'
import type { Identity } from '@/lib/supabase'

interface UploadCardProps {
  identity: Identity
  date: string
  onUploaded: () => void
}

type UploadState = 'idle' | 'selected' | 'uploading' | 'done' | 'error'

export default function UploadCard({ identity, date, onUploaded }: UploadCardProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setUploadState('selected')
    setError(null)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  async function handleSubmit() {
    if (!selectedFile) return
    setUploadState('uploading')
    setError(null)

    try {
      const photoUrl = await uploadPhoto(selectedFile, identity, date)
      await saveMemory(identity, date, photoUrl, caption.trim())
      setUploadState('done')
      setTimeout(onUploaded, 1200)
    } catch (err: any) {
      setError(err.message ?? 'Upload failed. Please try again.')
      setUploadState('selected')
    }
  }

  const isColor = identity === 'anthony' ? '#C084FC' : '#F472B6'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="max-w-sm mx-auto"
    >
      <p className="font-caveat text-center text-white/40 text-base mb-6">
        Your photo for today, {getDisplayName(identity)} ✦
      </p>

      {/* Drop zone */}
      <AnimatePresence mode="wait">
        {uploadState === 'idle' && (
          <motion.div
            key="dropzone"
            exit={{ opacity: 0, scale: 0.95 }}
            className={`upload-zone rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${dragOver ? 'dragover' : ''}`}
            style={{ minHeight: 200 }}
            onClick={() => inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex flex-col items-center gap-3">
              {/* Flower/tulip icon */}
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg viewBox="0 0 40 50" width="40" height="50">
                  <line x1="20" y1="25" x2="20" y2="50" stroke="#86a864" strokeWidth="2.5" />
                  <ellipse cx="20" cy="22" rx="8" ry="12" fill={isColor} opacity="0.8" />
                  <ellipse cx="14" cy="26" rx="6" ry="9" fill={isColor} opacity="0.6" />
                  <ellipse cx="26" cy="26" rx="6" ry="9" fill={isColor} opacity="0.6" />
                </svg>
              </motion.div>

              <p className="font-caveat text-white/50 text-base">
                {dragOver ? 'Drop it here ✦' : 'Tap to add your photo'}
              </p>
              <p className="font-caveat text-white/25 text-sm">or drag & drop</p>
            </div>
          </motion.div>
        )}

        {(uploadState === 'selected' || uploadState === 'uploading') && preview && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Preview image */}
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                aspectRatio: '1',
                boxShadow: `0 0 30px ${isColor}30`,
                border: `1px solid ${isColor}30`,
              }}
            >
              <Image src={preview} alt="Preview" fill className="object-cover" />
            </div>

            {/* Caption input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Add a caption... (optional)"
                value={caption}
                onChange={e => setCaption(e.target.value.slice(0, 100))}
                className="w-full bg-transparent border-b border-white/15 pb-2 pt-1
                           font-caveat text-base text-garden-ivory placeholder-white/25
                           outline-none focus:border-white/30 transition-colors"
              />
              <span className="absolute right-0 bottom-2 font-caveat text-xs text-white/20">
                {caption.length}/100
              </span>
            </div>

            {/* Submit & change buttons */}
            <div className="flex gap-3">
              <motion.button
                onClick={() => { setUploadState('idle'); setPreview(null); setSelectedFile(null) }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-full font-caveat text-white/40 border border-white/10
                           hover:border-white/20 transition-all text-sm"
              >
                Change photo
              </motion.button>

              <motion.button
                onClick={handleSubmit}
                disabled={uploadState === 'uploading'}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex-[2] py-3 rounded-full font-caveat text-base transition-all"
                style={{
                  background: `linear-gradient(135deg, ${isColor}40, ${isColor}20)`,
                  border: `1px solid ${isColor}50`,
                  color: isColor,
                  boxShadow: uploadState === 'uploading' ? 'none' : `0 0 20px ${isColor}25`,
                }}
              >
                {uploadState === 'uploading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <ButterflyLoader />
                    Planting...
                  </span>
                ) : (
                  'Add to the garden ✦'
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {uploadState === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10"
          >
            <motion.p
              className="font-cormorant text-4xl text-garden-ivory mb-2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5 }}
            >
              🌸
            </motion.p>
            <p className="font-caveat text-white/60 text-base">Added to the garden</p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-caveat text-center text-red-400/70 text-sm mt-3"
        >
          {error}
        </motion.p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </motion.div>
  )
}

function ButterflyLoader() {
  return (
    <motion.span
      style={{ display: 'inline-block' }}
      animate={{ rotate: [0, 10, -10, 0] }}
      transition={{ duration: 0.6, repeat: Infinity }}
    >
      🦋
    </motion.span>
  )
}
