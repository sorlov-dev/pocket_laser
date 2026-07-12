import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Html, useCursor } from '@react-three/drei'
import { a, useSpring } from '@react-spring/three'
import { R, reducedMotion } from '../refs'
import { useStore, pressButton, cancelModes } from '../stateMachine'
import {
  yellowMat,
  goldMat,
  goldKnurlMat,
  boreMat,
  blackPlasticMat,
} from '../materials'
import { makeDangerTexture } from '../textures/danger'
import { ensureAudio, click } from '../audio'
import { beginBodyDrag } from './GestureManager'
import { RearAssembly } from './BatteryBay'

function Button() {
  const buttonDown = useStore((s) => s.buttonDown)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const { px } = useSpring({ px: buttonDown ? 0.39 : 0.425, config: { tension: 500, friction: 26 } })
  return (
    <group>
      {/* base ring */}
      <mesh position={[0.38, 0.15, 0]} rotation-z={-Math.PI / 2} material={goldMat}>
        <cylinderGeometry args={[0.105, 0.105, 0.05, 24]} />
      </mesh>
      {/* brass dome */}
      <a.mesh position-x={px} position-y={0.15} scale={[0.7, 1, 1]} material={goldMat}>
        <sphereGeometry args={[0.09, 24, 16]} />
      </a.mesh>
      {/* generous invisible hit target — big enough to find without hunting */}
      <mesh
        position={[0.42, 0.15, 0]}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          ensureAudio()
          cancelModes()
          click(true)
          pressButton()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.4, 16, 12]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

// Speech-bubble hints that anchor to the button and cap and highlight the two
// starting moves, until the user first touches the object.
function Callouts() {
  const touched = useStore((s) => s.touched)
  const cls = `callout${touched ? ' gone' : ''}`
  return (
    <>
      <Html position={[0.4, 0.34, 0]} center pointerEvents="none" wrapperClass="callout-wrap" zIndexRange={[8, 0]}>
        <div className={cls}>Hold to fire</div>
      </Html>
      <Html position={[0, -1.75, 0]} center pointerEvents="none" wrapperClass="callout-wrap" zIndexRange={[8, 0]}>
        <div className={cls}>Twist to open</div>
      </Html>
    </>
  )
}

export function Pointer() {
  const group = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered, 'grab')
  const dangerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: makeDangerTexture(),
        roughness: 0.42,
        metalness: 0,
        envMapIntensity: 0.5,
      }),
    []
  )

  useLayoutEffect(() => {
    const g = group.current
    R.pointerGroup = g
    // side-on, near-horizontal pose so the muzzle fires off to the mid-left
    g.lookAt(-3, 0.05, 0.35)
    g.rotateZ(-0.5) // roll the brass button toward the camera
    g.updateMatrixWorld(true)
  }, [])

  useFrame(({ clock }) => {
    const g = group.current
    g.position.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.85) * 0.05
    g.updateMatrixWorld(true)
  })

  return (
    <group
      ref={group}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        ensureAudio()
        cancelModes()
        beginBodyDrag(e.nativeEvent)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* inner group: children built along +Y, mapped to pointer's +Z */}
      <group rotation-x={Math.PI / 2}>
        {/* glossy yellow body (open at the rear so the battery bore shows) */}
        <mesh position={[0, -0.1, 0]} material={yellowMat}>
          <cylinderGeometry args={[0.38, 0.38, 2.5, 48, 1, true]} />
        </mesh>
        {/* battery bore, visible through the open rear */}
        <mesh position={[0, -0.15, 0]} material={boreMat}>
          <cylinderGeometry args={[0.33, 0.33, 2.4, 32, 1, true]} />
        </mesh>
        {/* rear rim — gives the shell some wall thickness */}
        <mesh position={[0, -1.35, 0]} rotation-x={Math.PI / 2} material={yellowMat}>
          <torusGeometry args={[0.355, 0.025, 10, 40]} />
        </mesh>
        {/* front face */}
        <mesh position={[0, 1.15, 0]} rotation-x={-Math.PI / 2} material={yellowMat}>
          <circleGeometry args={[0.38, 48]} />
        </mesh>
        {/* DANGER label near the front */}
        <mesh position={[0, 0.7, 0]} material={dangerMat}>
          <cylinderGeometry args={[0.388, 0.388, 0.72, 48, 1, true]} />
        </mesh>
        {/* knurled band at the muzzle — part of the body, like in the reference */}
        <mesh position={[0, 1.23, 0]} material={goldKnurlMat}>
          <cylinderGeometry args={[0.4, 0.4, 0.16, 48]} />
        </mesh>
        <mesh position={[0, 1.311, 0]} rotation-x={-Math.PI / 2} material={goldMat}>
          <circleGeometry args={[0.4, 48]} />
        </mesh>
        {/* front thread stub (exposed when the nozzle is off) */}
        <mesh position={[0, 1.385, 0]} material={goldKnurlMat}>
          <cylinderGeometry args={[0.235, 0.235, 0.15, 32]} />
        </mesh>
        {/* aperture face + emitter */}
        <mesh position={[0, 1.461, 0]} rotation-x={-Math.PI / 2} material={blackPlasticMat}>
          <circleGeometry args={[0.21, 32]} />
        </mesh>
        <mesh position={[0, 1.465, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.045, 16]} />
          <meshBasicMaterial color="#3a0a08" toneMapped={false} />
        </mesh>

        <Button />
        <RearAssembly />
        <Callouts />
      </group>
    </group>
  )
}
