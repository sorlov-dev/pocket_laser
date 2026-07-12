import { useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import { R, NOZZLE_BASE_Z, SCREW_DIST, THREAD_TURNS } from '../refs'
import { getState, setState, clickTipNozzle } from '../stateMachine'
import { nozzleMats, blackPlasticMat } from '../materials'
import { ensureAudio, tick } from '../audio'

const Z_AXIS = new THREE.Vector3(0, 0, 1)
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const tmpQ = new THREE.Quaternion()
const ejMuz = new THREE.Vector3()

let domeGeo: THREE.LatheGeometry | null = null
function getDomeGeo() {
  if (!domeGeo) {
    const profile: [number, number][] = [
      [0.2, 0.0],
      [0.335, 0.025],
      [0.36, 0.1],
      [0.34, 0.21],
      [0.28, 0.32],
      [0.19, 0.4],
      [0.1, 0.45],
      [0.038, 0.468],
    ]
    domeGeo = new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(r, y)),
      48
    )
  }
  return domeGeo
}

// World pose of a nozzle sitting on the tip threads at a given travel.
export function computeTipPose(travel: number, outPos: THREE.Vector3, outQ: THREE.Quaternion) {
  const pg = R.pointerGroup!
  pg.updateMatrixWorld()
  outPos.set(0, 0, NOZZLE_BASE_Z + travel * SCREW_DIST).applyMatrix4(pg.matrixWorld)
  pg.getWorldQuaternion(outQ)
  outQ.multiply(tmpQ.setFromAxisAngle(Z_AXIS, travel * THREAD_TURNS * Math.PI * 2))
}

const EJECT_DUR = 0.5

// One golden cap. Only ever visible when it is the cap on the tip, or while it
// spins off after an unscrew — the spare caps live in the side list, not the scene.
function NozzleUnit({ idx }: { idx: number }) {
  const group = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const ej = useRef({ active: false, t: 0 })

  useFrame((_, dt) => {
    const s = getState()
    const g = group.current
    if (!R.pointerGroup) return
    const isTip = s.tipNozzle === idx
    const isEj = s.ejecting === idx
    g.visible = isTip || isEj
    if (isTip) {
      ej.current.active = false
      computeTipPose(s.tipTravel, g.position, g.quaternion)
      g.scale.setScalar(1)
    } else if (isEj) {
      if (!ej.current.active) {
        ej.current.active = true
        ej.current.t = 0
        computeTipPose(1, g.position, g.quaternion)
      }
      ej.current.t += dt
      const k = Math.min(ej.current.t / EJECT_DUR, 1)
      ejMuz.set(0, 0, 1).applyQuaternion(R.pointerGroup.quaternion)
      g.position.addScaledVector(ejMuz, dt * 2.6 * (1 - k))
      g.rotateOnAxis(Y_AXIS, dt * 7)
      g.scale.setScalar(Math.max(0.001, 1 - k * 0.9))
      if (k >= 1) {
        ej.current.active = false
        setState({ ejecting: null })
      }
    }
    g.updateMatrixWorld()
  })

  return (
    <group
      ref={group}
      visible={false}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        ensureAudio()
        if (getState().tipNozzle === idx) {
          tick()
          clickTipNozzle()
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (getState().tipNozzle === idx) setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <group rotation-x={Math.PI / 2}>
        {/* the golden dome */}
        <mesh geometry={getDomeGeo()} material={nozzleMats[idx]} />
        {/* aperture insert */}
        <mesh position={[0, 0.452, 0]} material={blackPlasticMat}>
          <cylinderGeometry args={[0.036, 0.036, 0.045, 16]} />
        </mesh>
        {/* invisible, generous hit target */}
        <mesh position={[0, 0.22, 0]}>
          <sphereGeometry args={[0.46, 12, 8]} />
          <meshBasicMaterial colorWrite={false} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

export function Nozzles() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <NozzleUnit key={i} idx={i} />
      ))}
    </>
  )
}
