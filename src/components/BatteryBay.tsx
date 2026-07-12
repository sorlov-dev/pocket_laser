import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import { R, FLOOR_Y, CAP_Z, SCREW_DIST, THREAD_TURNS, reducedMotion } from '../refs'
import { getState, setState, useStore, clickCap, capArrived } from '../stateMachine'
import { goldMat, goldKnurlMat } from '../materials'
import { getBatteryGeometry, getBatteryMaterials } from '../textures/battery'
import { PoseTween } from '../tween'
import { ensureAudio, tick, snap, thunk } from '../audio'
import { Chain } from './Chain'

const Z_AXIS = new THREE.Vector3(0, 0, 1)
const tmpQ = new THREE.Quaternion()
const tPos = new THREE.Vector3()
const tQ = new THREE.Quaternion()

// Cap parks at a fixed, comfortably-in-frame spot (independent of the lower floor).
const PARK_POS = new THREE.Vector3(1.5, -1.5, 2.15)
const PARK_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))

// LR41 stack positions inside the tube (pointer local Z)
const STACK_Z = [-1.0, -1.22, -1.44]
const OPENING_Z = -1.62

function capTipPose(travel: number, outPos: THREE.Vector3, outQ: THREE.Quaternion) {
  const pg = R.pointerGroup!
  pg.updateMatrixWorld()
  outPos.set(0, 0, CAP_Z - travel * SCREW_DIST).applyMatrix4(pg.matrixWorld)
  pg.getWorldQuaternion(outQ)
  outQ.multiply(tmpQ.setFromAxisAngle(Z_AXIS, -travel * THREAD_TURNS * Math.PI * 2))
}

// ---- rear parts that live on the pointer itself ----------------------------
// Rendered inside Pointer's axis group (children along +Y == pointer +Z).
export function RearAssembly() {
  const batteriesIn = useStore((s) => s.batteriesIn)
  return (
    <group>
      {/* rear thread stub the cap screws onto */}
      <mesh position={[0, -1.435, 0]} material={goldKnurlMat}>
        <cylinderGeometry args={[0.34, 0.34, 0.17, 32, 1, true]} />
      </mesh>
      {/* battery stack, visible through the open rear */}
      {STACK_Z.map((z, i) => (
        <group key={i} position={[0, z, 0]} visible={i < batteriesIn}>
          <mesh geometry={getBatteryGeometry()} material={getBatteryMaterials()} />
        </group>
      ))}
    </group>
  )
}

// ---- the chrome cap ---------------------------------------------------------
function Cap() {
  const group = useRef<THREE.Group>(null!)
  const tween = useMemo(() => new PoseTween(), [])
  const prev = useRef<string>('tip')
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  useFrame((_, dt) => {
    const s = getState()
    const g = group.current
    if (!R.pointerGroup) return
    if (s.capLoc === 'tip') {
      capTipPose(s.capTravel, g.position, g.quaternion)
    } else if (s.capLoc === 'parked') {
      g.position.copy(PARK_POS)
      g.quaternion.copy(PARK_QUAT)
    } else {
      if (prev.current !== s.capLoc) tween.begin(g, 0.85, 0.5)
      if (s.capLoc === 'fly-off') {
        if (tween.step(dt, PARK_POS, PARK_QUAT, g)) capArrived()
      } else {
        capTipPose(1, tPos, tQ)
        if (tween.step(dt, tPos, tQ, g)) capArrived()
      }
    }
    prev.current = s.capLoc
    g.updateMatrixWorld()
  })

  return (
    <group
      ref={(g: THREE.Group | null) => {
        R.capGroup = g
        if (g) group.current = g
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        ensureAudio()
        tick()
        clickCap()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <group rotation-x={Math.PI / 2}>
        {/* thin flange where the cap meets the body */}
        <mesh position={[0, -0.03, 0]} material={goldMat}>
          <cylinderGeometry args={[0.41, 0.41, 0.06, 40]} />
        </mesh>
        {/* short gold skirt */}
        <mesh position={[0, -0.16, 0]} material={goldMat}>
          <cylinderGeometry args={[0.395, 0.395, 0.2, 40]} />
        </mesh>
        {/* crown dome */}
        <mesh position={[0, -0.28, 0]} scale={[1, 0.62, 1]} material={goldMat}>
          <sphereGeometry args={[0.395, 32, 20]} />
        </mesh>
        {/* stem + ball finial, like the reference keychain */}
        <mesh position={[0, -0.5, 0]} material={goldMat}>
          <cylinderGeometry args={[0.04, 0.04, 0.09, 12]} />
        </mesh>
        <mesh position={[0, -0.565, 0]} material={goldMat}>
          <sphereGeometry args={[0.08, 20, 14]} />
        </mesh>
        {/* eyelet ring for the chain */}
        <mesh position={[0, -0.66, 0]} rotation-x={Math.PI / 2} material={goldMat}>
          <torusGeometry args={[0.06, 0.02, 8, 20]} />
        </mesh>
        {/* invisible generous hit target */}
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.5, 12, 8]} />
          <meshBasicMaterial colorWrite={false} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

// ---- loose batteries with toy physics ---------------------------------------
interface Bat {
  st: 'in' | 'fall' | 'loose' | 'return'
  pos: THREE.Vector3
  vel: THREE.Vector3
  quat: THREE.Quaternion
  spin: THREE.Vector3
  bounced: boolean
  tween: PoseTween
}

const spinQ = new THREE.Quaternion()
const rearDir = new THREE.Vector3()
const flatQ = new THREE.Quaternion()
const eul = new THREE.Euler()

function Batteries() {
  const bats = useMemo<Bat[]>(
    () =>
      [0, 1, 2].map(() => ({
        st: 'in' as const,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        spin: new THREE.Vector3(),
        bounced: false,
        tween: new PoseTween(),
      })),
    []
  )
  const refs = useRef<(THREE.Group | null)[]>([null, null, null])
  const ejectTimer = useRef(0)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.033)
    const s = getState()
    const pg = R.pointerGroup
    if (!pg) return

    // tilt-eject: rear end pointing down slides batteries out one by one
    const capOff = s.capLoc === 'parked' || s.capLoc === 'fly-off'
    if (capOff && s.batteriesIn > 0) {
      rearDir.set(0, 0, -1).applyQuaternion(pg.quaternion)
      if (rearDir.y < -0.42) {
        ejectTimer.current += dt
        if (ejectTimer.current > 0.32) {
          ejectTimer.current = 0
          const b = bats.find((x) => x.st === 'in')
          if (b) {
            pg.updateMatrixWorld()
            b.st = 'fall'
            b.bounced = false
            b.pos.set(0, 0, OPENING_Z).applyMatrix4(pg.matrixWorld)
            b.vel
              .copy(rearDir)
              .multiplyScalar(reducedMotion ? 1.0 : 2.1)
              .add(
                new THREE.Vector3((Math.random() - 0.5) * 0.9, 0.2, (Math.random() - 0.5) * 0.9)
              )
            pg.getWorldQuaternion(b.quat)
            b.quat.multiply(tmpQ.setFromEuler(eul.set(Math.PI / 2, 0, 0)))
            b.spin.set(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4)
            setState({ batteriesIn: s.batteriesIn - 1, everEjected: true })
            tick(0.7)
          }
        }
      } else {
        ejectTimer.current = 0
      }
    }

    for (let i = 0; i < 3; i++) {
      const b = bats[i]
      const mesh = refs.current[i]
      if (!mesh) continue
      mesh.visible = b.st !== 'in'
      if (b.st === 'fall') {
        b.vel.y -= 6.5 * dt
        b.pos.addScaledVector(b.vel, dt)
        spinQ.setFromEuler(eul.set(b.spin.x * dt, b.spin.y * dt, b.spin.z * dt))
        b.quat.multiply(spinQ)
        if (b.pos.y < FLOOR_Y + 0.1) {
          b.pos.y = FLOOR_Y + 0.1
          b.vel.y *= -0.32
          b.vel.x *= 0.55
          b.vel.z *= 0.55
          b.spin.multiplyScalar(0.5)
          if (!b.bounced) {
            b.bounced = true
            thunk()
          }
          if (b.vel.length() < 0.3) {
            b.st = 'loose'
            b.vel.set(0, 0, 0)
          }
        }
        mesh.position.copy(b.pos)
        mesh.quaternion.copy(b.quat)
      } else if (b.st === 'loose') {
        // settle flat like a coin cell
        flatQ.setFromEuler(eul.set(0, i * 1.3, 0))
        b.quat.slerp(flatQ, Math.min(1, dt * 6))
        b.pos.y = THREE.MathUtils.lerp(b.pos.y, FLOOR_Y + 0.1, Math.min(1, dt * 8))
        mesh.position.copy(b.pos)
        mesh.quaternion.copy(b.quat)
      } else if (b.st === 'return') {
        pg.updateMatrixWorld()
        tPos.set(0, 0, -1.28).applyMatrix4(pg.matrixWorld)
        pg.getWorldQuaternion(tQ)
        tQ.multiply(tmpQ.setFromEuler(eul.set(Math.PI / 2, 0, 0)))
        if (b.tween.step(dt, tPos, tQ, mesh)) {
          b.st = 'in'
          b.pos.copy(mesh.position)
          setState({ batteriesIn: getState().batteriesIn + 1 })
          snap()
        }
      }
    }
  })

  return (
    <>
      {[0, 1, 2].map((i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g
          }}
          visible={false}
          onPointerDown={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation()
            ensureAudio()
            const b = bats[i]
            if (b.st === 'loose') {
              b.st = 'return'
              b.tween.begin(refs.current[i]!, 0.6, 0.7)
              tick(1.2)
            }
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            if (bats[i].st === 'loose') setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
        >
          <mesh geometry={getBatteryGeometry()} material={getBatteryMaterials()} />
          {/* easy hit target */}
          <mesh>
            <sphereGeometry args={[0.36, 10, 8]} />
            <meshBasicMaterial colorWrite={false} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  )
}

export function BatterySystem() {
  return (
    <>
      <Cap />
      <Chain />
      <Batteries />
    </>
  )
}
