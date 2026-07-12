import type { SpriteKind } from './textures/sprites'

export interface PatternSpec {
  sprite: SpriteKind
  // wall-local XY offsets, plus per-instance scale & roll
  items: { x: number; y: number; s: number; r: number }[]
}

// Deterministic PRNG so patterns look the same every visit.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function scatter(seed: number, n: number, radius: number, sprite: SpriteKind): PatternSpec {
  const rnd = mulberry32(seed)
  const items = []
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2
    const r = Math.sqrt(rnd()) * radius
    items.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      s: 0.45 + rnd() * 0.75,
      r: rnd() * Math.PI * 2,
    })
  }
  return { sprite, items }
}

function grid(): PatternSpec {
  const items = []
  for (let i = -3; i <= 3; i++)
    for (let j = -3; j <= 3; j++)
      items.push({ x: i * 0.36, y: j * 0.36, s: 0.42, r: 0 })
  return { sprite: 'dot', items }
}

function spiral(): PatternSpec {
  const items = []
  for (let i = 0; i < 46; i++) {
    const th = i * 0.42
    const r = 0.06 + th * 0.072
    items.push({ x: Math.cos(th) * r, y: Math.sin(th) * r, s: 0.34 + i * 0.004, r: 0 })
  }
  return { sprite: 'dot', items }
}

const PATTERNS: PatternSpec[] = [
  scatter(11, 26, 1.15, 'heart'),
  scatter(29, 28, 1.2, 'star'),
  grid(),
  spiral(),
]

export function getPattern(idx: number): PatternSpec {
  return PATTERNS[idx]
}

// Single bright dot — laser with no nozzle.
export const BARE_DOT: PatternSpec = { sprite: 'dot', items: [{ x: 0, y: 0, s: 1.1, r: 0 }] }

// ---- HELLO signature -------------------------------------------------------

let helloCache: { x: number; y: number }[] | null = null
export function getHelloPoints(): { x: number; y: number }[] {
  if (helloCache) return helloCache
  const c = document.createElement('canvas')
  c.width = 360
  c.height = 100
  const g = c.getContext('2d')!
  g.font = '900 72px system-ui, -apple-system, sans-serif'
  g.textBaseline = 'middle'
  g.fillStyle = '#fff'
  g.fillText('HELLO', 12, 54)
  const data = g.getImageData(0, 0, 360, 100).data
  const pts: { x: number; y: number }[] = []
  const step = 5
  for (let y = 0; y < 100; y += step) {
    for (let x = 0; x < 360; x += step) {
      if (data[(y * 360 + x) * 4 + 3] > 128) {
        pts.push({ x: (x - 150) / 110, y: -(y - 50) / 110 })
      }
    }
  }
  helloCache = pts
  return pts
}
