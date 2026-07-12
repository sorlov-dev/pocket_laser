import * as THREE from 'three'

// The DANGER sticker, drawn entirely in canvas. Canvas X wraps around the
// barrel, Y runs along the pointer axis.
export function makeDangerTexture(): THREE.CanvasTexture {
  const w = 1024
  const h = 256
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!

  // aged-white label base
  g.fillStyle = '#efece2'
  g.fillRect(0, 0, w, h)
  // faint vertical grime streaks
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(120,110,90,${0.02 + Math.random() * 0.03})`
    const x = Math.random() * w
    g.fillRect(x, 0, 1 + Math.random() * 3, h)
  }

  // Two identical panels so the label reads from most angles.
  for (const ox of [8, 520]) {
    // red DANGER plate
    g.fillStyle = '#c8102e'
    g.beginPath()
    g.roundRect(ox, 18, 230, 62, 6)
    g.fill()
    g.fillStyle = '#ffffff'
    g.font = '900 44px system-ui, -apple-system, sans-serif'
    g.textBaseline = 'middle'
    g.fillText('DANGER', ox + 18, 52)

    // laser starburst
    const sx = ox + 300
    const sy = 48
    g.strokeStyle = '#c8102e'
    g.lineWidth = 3
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      g.beginPath()
      g.moveTo(sx + Math.cos(a) * 6, sy + Math.sin(a) * 6)
      g.lineTo(sx + Math.cos(a) * (16 + (i % 2) * 8), sy + Math.sin(a) * (16 + (i % 2) * 8))
      g.stroke()
    }
    g.fillStyle = '#c8102e'
    g.beginPath()
    g.arc(sx, sy, 4, 0, Math.PI * 2)
    g.fill()

    // headline of the legalese
    g.fillStyle = '#1c1c1c'
    g.font = '700 17px system-ui, -apple-system, sans-serif'
    g.fillText('LASER RADIATION — AVOID EXPOSURE', ox + 4, 104)

    // rows of tiny unreadable "technical" text
    g.fillStyle = '#5a5a55'
    for (let row = 0; row < 5; row++) {
      const y = 124 + row * 17
      let x = ox + 4
      while (x < ox + 470) {
        const len = 12 + Math.random() * 46
        g.fillRect(x, y, len, 3.4)
        x += len + 5 + Math.random() * 10
      }
    }
    // maker mark — our handle, woven into the label's fine print
    g.fillStyle = '#2a2a2a'
    g.font = '600 13px system-ui, -apple-system, sans-serif'
    g.fillText('MFG.  sorlov-dev', ox + 4, 216)
    // spec line
    g.fillStyle = '#2a2a2a'
    g.font = '600 13px system-ui, -apple-system, sans-serif'
    g.fillText('WAVELENGTH 630–680nM   MAX OUTPUT <1mW   CLASS IIIA', ox + 4, 238)

    // thin border of the panel
    g.strokeStyle = 'rgba(0,0,0,0.25)'
    g.lineWidth = 2
    g.strokeRect(ox - 4, 6, 486, 244)
  }

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.anisotropy = 4
  // rotate the seam to the back, keep a DANGER plate facing the camera side
  tex.offset.x = 0.16
  return tex
}
