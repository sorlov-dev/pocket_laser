import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { R, FLOOR_Y, reducedMotion } from '../refs'
import { goldMat } from '../materials'

const N = 9
const SEG = 0.088
const GRAV = new THREE.Vector3(0, -6, 0)
const Y_AXIS = new THREE.Vector3(0, 1, 0)

const pin = new THREE.Vector3()
const dir = new THREE.Vector3()
const mid = new THREE.Vector3()
const delta = new THREE.Vector3()
const rollQ = new THREE.Quaternion()

// Stable "orient local +Y along `d`" — unlike setFromUnitVectors, this never
// hits the antiparallel degeneracy (which makes hanging links spin forever),
// because the reference axis is chosen to stay clear of `d`.
const WORLD_X = new THREE.Vector3(1, 0, 0)
const refUp = new THREE.Vector3()
const bx = new THREE.Vector3()
const bz = new THREE.Vector3()
const basis = new THREE.Matrix4()
function orientAlong(q: THREE.Quaternion, d: THREE.Vector3) {
  refUp.set(0, 1, 0)
  if (Math.abs(d.y) > 0.9) refUp.copy(WORLD_X)
  bx.crossVectors(refUp, d).normalize()
  bz.crossVectors(bx, d).normalize()
  basis.makeBasis(bx, d, bz)
  q.setFromRotationMatrix(basis)
}

// Keychain: a verlet rope pinned to the cap's eyelet, rendered as torus links
// with a split ring at the end. Swings with the pointer's inertia.
export function Chain() {
  const linkRefs = useRef<(THREE.Mesh | null)[]>([])
  const ringRef = useRef<THREE.Mesh>(null!)
  const inited = useRef(false)
  const pts = useMemo(() => Array.from({ length: N }, () => new THREE.Vector3()), [])
  const prev = useMemo(() => Array.from({ length: N }, () => new THREE.Vector3()), [])
  const linkGeo = useMemo(() => new THREE.TorusGeometry(0.048, 0.014, 8, 16), [])
  const ringGeo = useMemo(() => new THREE.TorusGeometry(0.15, 0.018, 8, 28), [])

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.033)
    if (!R.capGroup) return
    R.capGroup.updateMatrixWorld()
    pin.set(0, 0, -0.66).applyMatrix4(R.capGroup.matrixWorld)

    if (!inited.current) {
      inited.current = true
      for (let i = 0; i < N; i++) {
        pts[i].set(pin.x, pin.y - i * SEG, pin.z)
        prev[i].copy(pts[i])
      }
    }

    const damp = reducedMotion ? 0.5 : 0.955
    for (let i = 1; i < N; i++) {
      const p = pts[i]
      delta.subVectors(p, prev[i]).multiplyScalar(damp)
      prev[i].copy(p)
      p.add(delta).addScaledVector(GRAV, dt * dt)
    }
    pts[0].copy(pin)
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 1; i < N; i++) {
        delta.subVectors(pts[i], pts[i - 1])
        const d = delta.length() || 1e-6
        const diff = (d - SEG) / d
        if (i === 1) {
          pts[i].addScaledVector(delta, -diff)
        } else {
          pts[i - 1].addScaledVector(delta, diff * 0.5)
          pts[i].addScaledVector(delta, -diff * 0.5)
        }
      }
      pts[0].copy(pin)
    }
    // floor
    for (let i = 1; i < N; i++) {
      if (pts[i].y < FLOOR_Y + 0.04) {
        pts[i].y = FLOOR_Y + 0.04
        prev[i].x = THREE.MathUtils.lerp(prev[i].x, pts[i].x, 0.2)
        prev[i].z = THREE.MathUtils.lerp(prev[i].z, pts[i].z, 0.2)
      }
    }

    for (let i = 0; i < N - 1; i++) {
      const m = linkRefs.current[i]
      if (!m) continue
      dir.subVectors(pts[i + 1], pts[i])
      const len = dir.length() || 1e-6
      dir.divideScalar(len)
      mid.addVectors(pts[i], pts[i + 1]).multiplyScalar(0.5)
      m.position.copy(mid)
      orientAlong(m.quaternion, dir)
      m.quaternion.multiply(rollQ.setFromAxisAngle(Y_AXIS, (i % 2) * (Math.PI / 2) + i * 0.35))
    }
    // split ring hangs off the last link
    dir.subVectors(pts[N - 1], pts[N - 2]).normalize()
    ringRef.current.position.copy(pts[N - 1]).addScaledVector(dir, 0.1)
    if (ringRef.current.position.y < FLOOR_Y + 0.05) ringRef.current.position.y = FLOOR_Y + 0.05
    orientAlong(ringRef.current.quaternion, dir)
  })

  return (
    <group>
      {Array.from({ length: N - 1 }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            linkRefs.current[i] = m
          }}
          geometry={linkGeo}
          material={goldMat}
        />
      ))}
      <mesh ref={ringRef} geometry={ringGeo} material={goldMat} />
    </group>
  )
}
