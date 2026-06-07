'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { THREE: any }
}

interface Props {
  openingDone: boolean
  isMobile: boolean
}

// ─── Shape generators ──────────────────────────────────────────────────────────

function heartPos(n: number, sc = 5.4, scatter = 5, scatterZ = 20) {
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    const x = 16 * Math.pow(Math.sin(t), 3)
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    a[i * 3]     = x * sc + (Math.random() - .5) * scatter
    a[i * 3 + 1] = y * sc + (Math.random() - .5) * scatter
    a[i * 3 + 2] = (Math.random() - .5) * scatterZ
  }
  return a
}

function starPos(n: number, scatter = 5, scatterZ = 20) {
  const a = new Float32Array(n * 3)
  const pts = 5, R = 98, r = 40
  const step = Math.PI * 2 / pts
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    const seg = t / step, frac = seg % 1
    const fa = Math.floor(seg) * step - Math.PI / 2
    const ma = fa + step / 2, ta = fa + step
    let angle: number, radius: number
    if (frac < 0.5) { const f = frac * 2;       angle = fa + (ma - fa) * f; radius = R + (r - R) * f }
    else             { const f = (frac - .5) * 2; angle = ma + (ta - ma) * f; radius = r + (R - r) * f }
    a[i * 3]     = Math.cos(angle) * radius + (Math.random() - .5) * scatter
    a[i * 3 + 1] = Math.sin(angle) * radius + (Math.random() - .5) * scatter
    a[i * 3 + 2] = (Math.random() - .5) * scatterZ
  }
  return a
}

function rosePos(n: number, scatter = 5, scatterZ = 20) {
  const a = new Float32Array(n * 3)
  const k = 3, R = 96
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    const r = R * Math.abs(Math.cos(k * t))
    a[i * 3]     = r * Math.cos(t) + (Math.random() - .5) * scatter
    a[i * 3 + 1] = r * Math.sin(t) + (Math.random() - .5) * scatter
    a[i * 3 + 2] = (Math.random() - .5) * scatterZ
  }
  return a
}

function infinityPos(n: number, scatter = 5, scatterZ = 20) {
  const a = new Float32Array(n * 3)
  const amp = 90
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    const d = 1 + Math.sin(t) * Math.sin(t)
    a[i * 3]     = amp * Math.cos(t) / d              + (Math.random() - .5) * scatter
    a[i * 3 + 1] = amp * Math.sin(t) * Math.cos(t) / d + (Math.random() - .5) * scatter
    a[i * 3 + 2] = (Math.random() - .5) * scatterZ
  }
  return a
}

function butterflyPos(n: number, scatter = 5, scatterZ = 20) {
  const a = new Float32Array(n * 3)
  const sc = 22
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 12
    const r = (Math.exp(Math.sin(t)) - 2 * Math.cos(4 * t) +
      Math.pow(Math.sin((2 * t - Math.PI) / 24), 5)) * sc
    a[i * 3]     = r * Math.cos(t) + (Math.random() - .5) * scatter
    a[i * 3 + 1] = r * Math.sin(t) + (Math.random() - .5) * scatter
    a[i * 3 + 2] = (Math.random() - .5) * scatterZ
  }
  return a
}

// ─── Core animation (runs after Three.js is available) ────────────────────────

function initAnimation(container: HTMLDivElement, isMobile: boolean): () => void {
  const THREE = window.THREE
  const COUNT   = isMobile ? 1000 : 2200
  const SCATTER = isMobile ? 4 : 5
  const SZ      = isMobile ? 14 : 20

  // Scale heart slightly smaller on mobile so it fits the narrower canvas
  const heartScale = isMobile ? 4.2 : 5.4

  // ── Scene ──────────────────────────────────────────────────────────────────
  const scene    = new THREE.Scene()
  const camera   = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 2000)
  camera.position.set(0, 0, 210)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)   // transparent — app bg shows through
  container.appendChild(renderer.domElement)

  // ── Buffers ─────────────────────────────────────────────────────────────
  const posArr = new Float32Array(COUNT * 3)
  const colArr = new Float32Array(COUNT * 3)
  for (let i = 0; i < COUNT; i++) {
    const t = i / COUNT
    // Deep violet → pink — matches app palette (#8B5CF6 → #f9a8d4)
    colArr[i * 3]     = 0.54 + t * 0.44
    colArr[i * 3 + 1] = 0.36 - t * 0.02
    colArr[i * 3 + 2] = 0.96 - t * 0.14
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  geometry.setAttribute('color',    new THREE.BufferAttribute(colArr, 3))

  // Glow sprite
  const spriteCanvas = document.createElement('canvas')
  spriteCanvas.width = spriteCanvas.height = 64
  const ctx = spriteCanvas.getContext('2d')!
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0,    'rgba(255,255,255,1)')
  grad.addColorStop(0.28, 'rgba(200,140,255,0.95)')
  grad.addColorStop(0.65, 'rgba(140,80,230,0.5)')
  grad.addColorStop(1,    'rgba(100,30,180,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)

  const material = new THREE.PointsMaterial({
    size: isMobile ? 2.2 : 2.6,
    map: new THREE.CanvasTexture(spriteCanvas),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })

  const points = new THREE.Points(geometry, material)
  scene.add(points)

  // ── Shapes ──────────────────────────────────────────────────────────────
  const SHAPES = [
    { build: (n: number) => heartPos(n, heartScale, SCATTER, SZ), label: 'heart'     },
    { build: (n: number) => starPos(n, SCATTER, SZ),              label: 'star'      },
    { build: (n: number) => butterflyPos(n, SCATTER, SZ),         label: 'butterfly' },
    { build: (n: number) => infinityPos(n, SCATTER, SZ),          label: 'infinity'  },
    { build: (n: number) => rosePos(n, SCATTER, SZ),              label: 'flower'    },
  ]
  const targets = SHAPES.map(s => s.build(COUNT))

  // ── Intro: staggered per-particle burst from center (TikTok style) ──────
  const introVecs: any[] = []
  const heartData = targets[0]
  for (let i = 0; i < COUNT; i++) {
    introVecs.push(new THREE.Vector3(
      heartData[i * 3], heartData[i * 3 + 1], heartData[i * 3 + 2]
    ))
  }

  let introDone = false

  const introTl = gsap.timeline({
    onComplete() {
      for (let i = 0; i < COUNT; i++) {
        posArr[i * 3]     = introVecs[i].x
        posArr[i * 3 + 1] = introVecs[i].y
        posArr[i * 3 + 2] = introVecs[i].z
      }
      introDone = true
      scheduleNext()
    },
  })

  const maxDur    = isMobile ? 3.0 : 4.5
  const minDur    = isMobile ? 1.2 : 2.0
  const staggerMs = isMobile ? 0.0015 : 0.001

  for (let i = 0; i < COUNT; i++) {
    introTl.from(introVecs[i], {
      x: 0, y: 0, z: 0,
      ease: 'power2.inOut',
      duration: gsap.utils.random(minDur, maxDur),
    }, i * staggerMs)
  }

  // ── Morph loop ───────────────────────────────────────────────────────────
  const proxy = { t: 0 }
  let shapeIndex = 1
  const snap = new Float32Array(COUNT * 3)

  function morphTo(target: Float32Array, dur: number, done: () => void) {
    snap.set(posArr)
    proxy.t = 0
    gsap.to(proxy, {
      t: 1, duration: dur, ease: 'power2.inOut',
      onUpdate() {
        const t = proxy.t, it = 1 - t
        for (let i = 0; i < COUNT * 3; i++) posArr[i] = snap[i] * it + target[i] * t
        geometry.attributes.position.needsUpdate = true
      },
      onComplete: done,
    })
  }

  function scheduleNext() {
    gsap.delayedCall(1.8, () => {
      morphTo(targets[shapeIndex], 2.2, () => {
        shapeIndex = (shapeIndex + 1) % SHAPES.length
        scheduleNext()
      })
    })
  }

  // ── Render loop ──────────────────────────────────────────────────────────
  let time = 0
  const tickerFn = () => {
    time += 0.005
    if (!introDone) {
      for (let i = 0; i < COUNT; i++) {
        posArr[i * 3]     = introVecs[i].x
        posArr[i * 3 + 1] = introVecs[i].y
        posArr[i * 3 + 2] = introVecs[i].z
      }
      geometry.attributes.position.needsUpdate = true
    }
    points.rotation.y = Math.sin(time * 0.35) * 0.22
    points.rotation.x = Math.sin(time * 0.22) * 0.07
    renderer.render(scene, camera)
  }
  gsap.ticker.add(tickerFn)

  // ── Visibility — pause RAF when tab hidden ───────────────────────────────
  const onVisibility = () => {
    if (document.hidden) gsap.ticker.sleep()
    else gsap.ticker.wake()
  }
  document.addEventListener('visibilitychange', onVisibility)

  // ── Resize ───────────────────────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    if (!container.clientWidth) return
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  })
  ro.observe(container)

  // ── Cleanup ──────────────────────────────────────────────────────────────
  return () => {
    ro.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    gsap.ticker.remove(tickerFn)
    introTl.kill()
    gsap.killTweensOf(proxy)
    gsap.killTweensOf(introVecs)
    gsap.globalTimeline.clear()   // kills any pending delayedCalls from scheduleNext
    geometry.dispose()
    material.dispose()
    renderer.dispose()
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement)
    }
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ParticleShapes({ openingDone, isMobile }: Props) {
  const mountRef  = useRef<HTMLDivElement>(null)
  const cleanupFn = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!openingDone || !mountRef.current) return

    const container = mountRef.current

    function start() {
      cleanupFn.current = initAnimation(container, isMobile)
    }

    if (window.THREE) {
      start()
    } else {
      // Load Three.js from CDN — no npm install needed
      const existing = document.querySelector<HTMLScriptElement>('script[data-particle-three]')
      if (existing) {
        // Script already injected, wait for it
        existing.addEventListener('load', start, { once: true })
      } else {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
        script.dataset.particleThree = 'true'
        script.addEventListener('load', start, { once: true })
        document.head.appendChild(script)
      }
    }

    return () => {
      cleanupFn.current?.()
      cleanupFn.current = null
    }
  }, [openingDone, isMobile])

  // Dimensions: mobile narrower + shorter, desktop wider + taller
  const width  = isMobile ? '90vw'  : '64vw'
  const height = isMobile ? '52vh'  : '62vh'

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{
        position:        'absolute',
        top:             isMobile ? '4%' : '3%',
        left:            '50%',
        transform:       'translateX(-50%)',
        width,
        height,
        zIndex:          3,
        pointerEvents:   'none',
      }}
    />
  )
}
