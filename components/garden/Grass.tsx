'use client'

import { useMemo } from 'react'

interface GrassProps {
  layer: 0 | 1 | 2
}

const LAYER_CONFIG = {
  0: { color: 'rgba(60,90,45,0.5)',   height: [12, 22], count: 45, blur: 'blur-sm', opacity: 0.45, bottom: 0 },
  1: { color: 'rgba(75,110,55,0.65)', height: [15, 28], count: 38, blur: '',         opacity: 0.60, bottom: 0 },
  2: { color: 'rgba(95,135,70,0.75)', height: [18, 34], count: 32, blur: '',         opacity: 0.75, bottom: 0 },
}

const ANIM_CLASSES = ['grass-sway', 'grass-sway-alt', 'grass-sway-slow']

export default function Grass({ layer }: GrassProps) {
  const config = LAYER_CONFIG[layer]

  const blades = useMemo(() => {
    return Array.from({ length: config.count }, (_, i) => {
      const x = (i / config.count) * 108 - 4
      const h = config.height[0] + ((i * 37 + layer * 13) % 100) / 100 * (config.height[1] - config.height[0])
      const cpxOff = (((i * 53) % 20) - 10)
      const tipOff = (((i * 71) % 14) - 7)
      return { id: i, x, h, cpxOff, tipOff, animClass: ANIM_CLASSES[i % 3] }
    })
  }, [config.count, config.height, layer])

  return (
    <div
      className={`absolute w-full pointer-events-none ${config.blur}`}
      style={{ bottom: 0, opacity: config.opacity, zIndex: layer + 1 }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        width="100%"
        height="50"
        style={{ overflow: 'visible', display: 'block' }}
      >
        {blades.map(b => (
          <path
            key={b.id}
            d={`M ${b.x} 100 Q ${b.x + b.cpxOff} ${100 - b.h * 0.55} ${b.x + b.tipOff} ${100 - b.h}`}
            fill="none"
            stroke={config.color}
            strokeWidth={1.2 + ((b.id * 17) % 10) / 10}
            strokeLinecap="round"
            className={b.animClass}
            style={{ transformOrigin: `${b.x}px 100px` }}
          />
        ))}
      </svg>
    </div>
  )
}
