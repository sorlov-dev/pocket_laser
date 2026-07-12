import * as THREE from 'three'

// LR41 button-cell materials: [side, top (+, engraved), bottom (− terminal)].
// All faces are canvas-drawn — brushed nickel, stamped text, gasket ring.

function makeTopTexture(): THREE.CanvasTexture {
  const s = 256
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')!

  const grad = g.createRadialGradient(s / 2, s / 2, 10, s / 2, s / 2, s / 2)
  grad.addColorStop(0, '#e3e5e9')
  grad.addColorStop(0.55, '#c9ccd2')
  grad.addColorStop(0.85, '#b4b8bf')
  grad.addColorStop(1, '#9a9ea6')
  g.fillStyle = grad
  g.fillRect(0, 0, s, s)

  // faint circular machining marks
  for (let r = 18; r < 120; r += 7) {
    g.beginPath()
    g.arc(s / 2, s / 2, r, 0, Math.PI * 2)
    g.strokeStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`
    g.lineWidth = 1
    g.stroke()
  }
  // rolled edge ring
  g.beginPath()
  g.arc(s / 2, s / 2, 116, 0, Math.PI * 2)
  g.strokeStyle = 'rgba(70,74,80,0.5)'
  g.lineWidth = 7
  g.stroke()

  // engraved stamp
  g.fillStyle = 'rgba(78,82,90,0.9)'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = '700 52px system-ui, sans-serif'
  g.fillText('LR41', s / 2, s / 2 - 14)
  g.font = '600 30px system-ui, sans-serif'
  g.fillText('1.5V', s / 2, s / 2 + 34)
  g.font = '700 34px system-ui, sans-serif'
  g.fillText('+', s / 2, s / 2 - 74)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function makeSideTexture(): THREE.CanvasTexture {
  const w = 256
  const h = 64
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!

  g.fillStyle = '#c6c9cf'
  g.fillRect(0, 0, w, h)
  // vertical brushed streaks
  for (let x = 0; x < w; x++) {
    const v = Math.random()
    g.fillStyle = v > 0.5 ? `rgba(255,255,255,${(v - 0.5) * 0.18})` : `rgba(40,44,50,${(0.5 - v) * 0.16})`
    g.fillRect(x, 0, 1, h)
  }
  // dark plastic gasket ring near the negative (top) edge
  g.fillStyle = '#4d5057'
  g.fillRect(0, 4, w, 7)
  g.fillStyle = 'rgba(255,255,255,0.25)'
  g.fillRect(0, 11, w, 2)
  // rolled lip at the positive (bottom) edge
  g.fillStyle = 'rgba(255,255,255,0.3)'
  g.fillRect(0, h - 6, w, 3)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.repeat.set(3, 1)
  return tex
}

function makeBottomTexture(): THREE.CanvasTexture {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')!
  // negative side: smaller inset disc
  g.fillStyle = '#b7bac0'
  g.fillRect(0, 0, s, s)
  g.beginPath()
  g.arc(s / 2, s / 2, 40, 0, Math.PI * 2)
  g.fillStyle = '#93969d'
  g.fill()
  g.beginPath()
  g.arc(s / 2, s / 2, 40, 0, Math.PI * 2)
  g.strokeStyle = 'rgba(50,53,58,0.55)'
  g.lineWidth = 4
  g.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

let cache: THREE.MeshStandardMaterial[] | null = null
export function getBatteryMaterials(): THREE.MeshStandardMaterial[] {
  if (!cache) {
    cache = [
      new THREE.MeshStandardMaterial({
        map: makeSideTexture(),
        metalness: 0.85,
        roughness: 0.4,
        envMapIntensity: 0.7,
      }),
      new THREE.MeshStandardMaterial({
        map: makeTopTexture(),
        metalness: 0.8,
        roughness: 0.38,
        envMapIntensity: 0.7,
      }),
      new THREE.MeshStandardMaterial({
        map: makeBottomTexture(),
        metalness: 0.85,
        roughness: 0.45,
        envMapIntensity: 0.6,
      }),
    ]
  }
  return cache
}

let geo: THREE.CylinderGeometry | null = null
export function getBatteryGeometry(): THREE.CylinderGeometry {
  if (!geo) geo = new THREE.CylinderGeometry(0.27, 0.27, 0.22, 28)
  return geo
}
