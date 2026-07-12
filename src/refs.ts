import * as THREE from 'three'

// Minimal structural view of the OrbitControls instance we actually touch.
interface OrbitLike {
  enabled: boolean
  target: THREE.Vector3
  update: () => void
}

// Module-level shared refs: transient scene handles that don't belong in React state.
export const R = {
  controls: null as OrbitLike | null,
  pointerGroup: null as THREE.Group | null,
  capGroup: null as THREE.Group | null,
  // Where the laser pattern floats in the black, derived from the muzzle each frame.
  aimTarget: new THREE.Vector3(-3.4, 1.1, -4.6),
}

// Invisible ground plane, well below the floating pointer so the chain hangs
// free and dropped cells have room to tumble (but stay in frame).
export const FLOOR_Y = -2.2

// Pointer body layout (local space, +Z = forward / nozzle end)
export const BODY_R = 0.38
export const BODY_FRONT = 1.15 // yellow body ends, knurled band begins
export const TIP_Z = 1.45 // aperture without nozzle (thread stub end)
export const NOZZLE_BASE_Z = 1.31 // where nozzle base sits when screwed tight
export const NOZZLE_LEN = 0.47 // aperture offset from base when nozzle on
export const REAR_Z = -1.35 // yellow body rear end
export const CAP_Z = -1.42 // cap group origin when screwed tight
export const CAP_LEN = 0.6
export const THREAD_TURNS = 2.5
export const THREAD_PITCH = 0.13 // axial travel per unit of `travel` is TURNS*PITCH

export const SCREW_DIST = 0.32 // total axial travel while unscrewing

// How far ahead of the muzzle the projected pattern hangs in the void.
export const PATTERN_DIST = 4.0

export const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Portrait (tall, narrow) viewports — phones — frame a long horizontal object
// poorly, so we pull the camera back and tilt the pointer diagonally there.
// Desktop / landscape is left exactly as it was.
export const isPortrait = () =>
  typeof window !== 'undefined' && window.innerHeight > window.innerWidth

const _fwd = new THREE.Vector3()

// Recompute where the pattern floats: straight out of the muzzle, into the black.
export function updateAimTarget() {
  const pg = R.pointerGroup
  if (!pg) return
  pg.updateMatrixWorld()
  _fwd.set(0, 0, 1).applyQuaternion(pg.quaternion)
  R.aimTarget.copy(pg.position).addScaledVector(_fwd, TIP_Z + PATTERN_DIST)
}
