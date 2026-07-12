import * as THREE from 'three'

// White-on-transparent sprites for the projected laser pattern.
// Drawn white so the material color can tint them laser-red.
export type SpriteKind = 'dot' | 'heart' | 'star'

function canvas(size = 128) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return c
}

function toTexture(c: HTMLCanvasElement): THREE.Texture {
  const t = new THREE.CanvasTexture(c)
  t.anisotropy = 2
  return t
}

function makeDot(): THREE.Texture {
  const c = canvas()
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 60)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.9)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return toTexture(c)
}

function makeHeart(): THREE.Texture {
  const c = canvas()
  const g = c.getContext('2d')!
  g.translate(64, 60)
  g.scale(1.05, 1.05)
  g.shadowColor = 'rgba(255,255,255,0.9)'
  g.shadowBlur = 14
  g.fillStyle = '#fff'
  g.beginPath()
  g.moveTo(0, 18)
  g.bezierCurveTo(-38, -12, -26, -40, 0, -22)
  g.bezierCurveTo(26, -40, 38, -12, 0, 18)
  g.closePath()
  g.fill()
  g.fill()
  return toTexture(c)
}

function makeStar(): THREE.Texture {
  const c = canvas()
  const g = c.getContext('2d')!
  g.translate(64, 64)
  g.shadowColor = 'rgba(255,255,255,0.9)'
  g.shadowBlur = 12
  g.fillStyle = '#fff'
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 34 : 14
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.closePath()
  g.fill()
  g.fill()
  return toTexture(c)
}

let cache: Record<SpriteKind, THREE.Texture> | null = null
export function getSprites(): Record<SpriteKind, THREE.Texture> {
  if (!cache) cache = { dot: makeDot(), heart: makeHeart(), star: makeStar() }
  return cache
}

// Fine vertical stripes — used as a roughness map to fake knurling.
let knurlTex: THREE.Texture | null = null
export function getKnurlTexture(): THREE.Texture {
  if (knurlTex) return knurlTex
  const c = canvas(128)
  const g = c.getContext('2d')!
  g.fillStyle = '#909090'
  g.fillRect(0, 0, 128, 128)
  g.fillStyle = '#e8e8e8'
  for (let x = 0; x < 128; x += 4) g.fillRect(x, 0, 2, 128)
  knurlTex = new THREE.CanvasTexture(c)
  knurlTex.wrapS = knurlTex.wrapT = THREE.RepeatWrapping
  knurlTex.repeat.set(6, 1)
  return knurlTex
}
