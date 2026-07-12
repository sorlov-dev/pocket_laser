import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { R, NOZZLE_BASE_Z, NOZZLE_LEN, SCREW_DIST, TIP_Z, reducedMotion } from '../refs'
import { getState, laserReady } from '../stateMachine'
import { getSprites } from '../textures/sprites'

const Y_AXIS = new THREE.Vector3(0, 1, 0)
const origin = new THREE.Vector3()
const dir = new THREE.Vector3()

export function Beam() {
  const grp = useRef<THREE.Group>(null!)
  const flare = useRef<THREE.Mesh>(null!)

  const coreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(4, 0.18, 0.15),
        transparent: true,
        opacity: 0.95,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  )
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.4, 0.07, 0.06),
        transparent: true,
        opacity: 0.14,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  )
  const flareMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: getSprites().dot,
        color: new THREE.Color(5, 0.3, 0.25),
        transparent: true,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  )

  useFrame(({ clock, camera }) => {
    const s = getState()
    const on = s.buttonDown && laserReady(s)
    grp.current.visible = on
    flare.current.visible = on
    if (!on || !R.pointerGroup) return
    R.pointerGroup.updateMatrixWorld()
    const tipLocalZ =
      s.tipNozzle !== null
        ? NOZZLE_BASE_Z + s.tipTravel * SCREW_DIST + NOZZLE_LEN - 0.01
        : TIP_Z + 0.04
    origin.set(0, 0, tipLocalZ).applyMatrix4(R.pointerGroup.matrixWorld)
    dir.subVectors(R.aimTarget, origin)
    const len = dir.length()
    dir.normalize()
    grp.current.position.copy(origin).addScaledVector(dir, len / 2)
    grp.current.quaternion.setFromUnitVectors(Y_AXIS, dir)
    grp.current.scale.set(1, len, 1)
    const breathe = reducedMotion ? 1 : 0.82 + 0.18 * Math.sin(clock.elapsedTime * 3.1)
    coreMat.opacity = 0.95 * breathe
    haloMat.opacity = 0.13 * breathe
    // aperture flare, billboarded
    flare.current.position.copy(origin).addScaledVector(dir, 0.02)
    flare.current.quaternion.copy(camera.quaternion)
    const fs = (reducedMotion ? 0.2 : 0.17 + 0.05 * Math.sin(clock.elapsedTime * 7)) as number
    flare.current.scale.setScalar(fs)
  })

  return (
    <>
      <group ref={grp} visible={false}>
        <mesh material={coreMat}>
          <cylinderGeometry args={[0.0075, 0.0075, 1, 6, 1, true]} />
        </mesh>
        <mesh material={haloMat}>
          <cylinderGeometry args={[0.03, 0.03, 1, 6, 1, true]} />
        </mesh>
      </group>
      <mesh ref={flare} visible={false} material={flareMat}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </>
  )
}
