// All sounds are synthesized with WebAudio — no files.
let ctx: AudioContext | null = null

export function ensureAudio() {
  if (!ctx) {
    try {
      ctx = new AudioContext()
    } catch {
      return
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
}

function noiseBuffer(c: AudioContext, dur: number): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

// Tiny ratchet tick — filtered noise burst.
export function tick(pitch = 1) {
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 0.02)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2600 * pitch * (0.94 + Math.random() * 0.12)
  bp.Q.value = 6
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.06, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
  src.connect(bp).connect(g).connect(ctx.destination)
  src.start(t)
}

// Button click — short square blip.
export function click(down: boolean) {
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.value = down ? 1900 : 1450
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.035, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.015)
  osc.connect(g).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.02)
  tick(down ? 1.3 : 1.0)
}

// Thread fully seated — satisfying snap.
export function snap() {
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(420, t)
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.06)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.09, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
  osc.connect(g).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.1)
  tick(0.8)
}

// Small metallic landing thud (battery hits the floor).
export function thunk(strength = 1) {
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(300 + Math.random() * 120, t)
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.05)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.05 * strength, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
  osc.connect(g).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.08)
}
