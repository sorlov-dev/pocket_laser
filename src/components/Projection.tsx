import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { R, reducedMotion } from '../refs'
import { getState, setState, laserReady } from '../stateMachine'
import { getSprites } from '../textures/sprites'
import { getPattern, BARE_DOT, getHelloPoints } from '../patterns'

const dummy = new THREE.Object3D()

// The laser pattern, hanging in the black in front of the muzzle. Billboards to
// the camera so it always reads, breathes in brightness, and plays the one-time
// HELLO signature on first fire.
export function Projection() {
  const sprites = getSprites()
  const geo = useMemo(() => new THREE.PlaneGeometry(0.3, 0.3), [])
  const patMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: sprites.dot,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        color: new THREE.Color(1.25, 0.07, 0.06),
      }),
    [sprites]
  )
  const helloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: sprites.dot,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        color: new THREE.Color(3.6, 0.18, 0.15),
      }),
    [sprites]
  )
  const group = useRef<THREE.Group>(null!)
  const patRef = useRef<THREE.InstancedMesh>(null!)
  const helloRef = useRef<THREE.InstancedMesh>(null!)
  const light = useRef<THREE.PointLight>(null!)
  const lastKey = useRef(-99)
  const hello = useRef<{ stage: 'pre' | 'form' | 'hold' | 'burst' | 'done'; t: number }>({
    stage: 'pre',
    t: 0,
  })
  const helloPts = useMemo(getHelloPoints, [])
  const dirs = useMemo(
    () =>
      helloPts.map((_, i) => {
        const a = i * 2.399963 // golden angle scatter
        const r = 0.7 + (((i * 7919) % 97) / 97) * 1.5
        return { x: Math.cos(a) * r, y: Math.sin(a) * r }
      }),
    [helloPts]
  )

  useFrame((st, dt) => {
    const s = getState()
    const on = s.buttonDown && laserReady(s)
    group.current.visible = on
    light.current.intensity = on
      ? reducedMotion
        ? 8
        : 7.5 + Math.sin(st.clock.elapsedTime * 2.6) * 1.5
      : 0
    if (!on) return

    if (!s.fired) {
      setState({ fired: true })
      hello.current.stage = 'form'
      hello.current.t = 0
    }

    // Sit at the floating target and face the camera.
    group.current.position.copy(R.aimTarget)
    group.current.quaternion.copy(st.camera.quaternion)
    group.current.scale.setScalar(1.7)
    light.current.position.copy(R.aimTarget)

    const spec = s.tipNozzle !== null ? getPattern(s.tipNozzle) : BARE_DOT
    const key = s.tipNozzle ?? -1
    if (key !== lastKey.current) {
      lastKey.current = key
      patMat.map = spec.sprite === 'dot' ? sprites.dot : sprites[spec.sprite]
      patRef.current.count = spec.items.length
      spec.items.forEach((it, i) => {
        dummy.position.set(it.x, it.y, i * 0.0004)
        dummy.rotation.set(0, 0, it.r)
        dummy.scale.setScalar(it.s)
        dummy.updateMatrix()
        patRef.current.setMatrixAt(i, dummy.matrix)
      })
      patRef.current.instanceMatrix.needsUpdate = true
    }

    const h = hello.current
    const breath = reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(st.clock.elapsedTime * 2.4)
    if (h.stage === 'form' || h.stage === 'hold' || h.stage === 'burst') {
      h.t += dt
      const n = helloPts.length
      helloRef.current.count = n
      if (h.stage === 'form') {
        const D = reducedMotion ? 0.3 : 0.6
        for (let i = 0; i < n; i++) {
          const k = THREE.MathUtils.clamp((h.t - (i / n) * 0.25) / (D * 0.6), 0, 1)
          dummy.position.set(helloPts[i].x, helloPts[i].y, 0.001)
          dummy.rotation.set(0, 0, 0)
          dummy.scale.setScalar(0.42 * k + 0.001)
          dummy.updateMatrix()
          helloRef.current.setMatrixAt(i, dummy.matrix)
        }
        helloMat.opacity = 1
        patMat.opacity = 0
        if (h.t >= D + 0.25) {
          h.stage = 'hold'
          h.t = 0
        }
      } else if (h.stage === 'hold') {
        for (let i = 0; i < n; i++) {
          const tw = reducedMotion ? 1 : 0.9 + 0.1 * Math.sin(st.clock.elapsedTime * 6 + i)
          dummy.position.set(helloPts[i].x, helloPts[i].y, 0.001)
          dummy.rotation.set(0, 0, 0)
          dummy.scale.setScalar(0.42 * tw)
          dummy.updateMatrix()
          helloRef.current.setMatrixAt(i, dummy.matrix)
        }
        helloMat.opacity = 1
        patMat.opacity = 0
        if (h.t >= 1.0) {
          h.stage = 'burst'
          h.t = 0
        }
      } else {
        const D = reducedMotion ? 0.35 : 0.75
        const k = THREE.MathUtils.clamp(h.t / D, 0, 1)
        const ke = 1 - Math.pow(1 - k, 3)
        const fly = reducedMotion ? 0 : 1.5
        for (let i = 0; i < n; i++) {
          dummy.position.set(
            helloPts[i].x + dirs[i].x * ke * fly,
            helloPts[i].y + dirs[i].y * ke * fly,
            0.001
          )
          dummy.rotation.set(0, 0, 0)
          dummy.scale.setScalar(0.42 * (1 - k) + 0.001)
          dummy.updateMatrix()
          helloRef.current.setMatrixAt(i, dummy.matrix)
        }
        helloMat.opacity = 1 - k
        patMat.opacity = k * breath
        if (h.t >= D) {
          h.stage = 'done'
          helloRef.current.count = 0
        }
      }
      helloRef.current.instanceMatrix.needsUpdate = true
    } else {
      helloRef.current.count = 0
      patMat.opacity = breath
    }
  })

  return (
    <>
      <group ref={group} visible={false}>
        <instancedMesh ref={patRef} args={[geo, patMat, 64]} frustumCulled={false} />
        <instancedMesh ref={helloRef} args={[geo, helloMat, 480]} frustumCulled={false} />
      </group>
      <pointLight ref={light} color="#ff2015" distance={7} decay={2} intensity={0} />
    </>
  )
}
