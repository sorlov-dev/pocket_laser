import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { R, THREAD_TURNS, updateAimTarget } from '../refs'
import { getState, setState, releaseButton, laserReady, type State } from '../stateMachine'
import { tick, snap, click } from '../audio'

// Body-drag state, exported so Pointer can start a drag from its own handler.
export const bodyDrag = { active: false, x: 0, y: 0, moved: 0 }
export function beginBodyDrag(e: { clientX: number; clientY: number }) {
  bodyDrag.active = true
  bodyDrag.x = e.clientX
  bodyDrag.y = e.clientY
  bodyDrag.moved = 0
  setState({ touched: true })
  document.body.style.cursor = 'grabbing'
}

const camRight = new THREE.Vector3()
const camUp = new THREE.Vector3()
const q1 = new THREE.Quaternion()
const q2 = new THREE.Quaternion()
const anchor = new THREE.Vector3()

// Fire-view camera framing (see computeFirePose).
const WORLD_UP = new THREE.Vector3(0, 1, 0)
const btnDir = new THREE.Vector3()
const muzDir = new THREE.Vector3()
const viewDir = new THREE.Vector3()
const sideDir = new THREE.Vector3()
const firePos = new THREE.Vector3()
const fireTarget = new THREE.Vector3()
const tmpTarget = new THREE.Vector3()

// Over-the-shoulder fire view: camera sits behind + to the button side + above,
// and looks FORWARD along the barrel so the projected pattern is centre-frame.
const CAM_SIDE = 3.2 // offset toward the button side (keeps the button visible)
const CAM_UP = 3.4 // elevation above the pointer
const CAM_BACK = 5.2 // offset behind the muzzle (down the -forward axis)
const LOOK_AHEAD = 1.8 // aim the view forward, toward the pattern
const LOOK_UP = 0.1
const PARALLAX_X = 0.9 // how much the mouse nudges the fire view
const PARALLAX_Y = 0.6

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

const SCREW_MODES = ['nozzle-unscrewing', 'nozzle-screwing', 'cap-unscrewing']

export function GestureManager() {
  const { camera } = useThree()
  const screw = useRef({ last: 0, has: false, acc: 0, mode: '' })
  const autoAcc = useRef(0)
  // Fire-view camera state: progress 0 = user's framing, 1 = button close-up.
  const cam = useRef({
    progress: 0,
    active: false,
    homePos: new THREE.Vector3(),
    homeTarget: new THREE.Vector3(),
  })

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = getState()
      if (bodyDrag.active && R.pointerGroup) {
        const dx = e.clientX - bodyDrag.x
        const dy = e.clientY - bodyDrag.y
        bodyDrag.x = e.clientX
        bodyDrag.y = e.clientY
        bodyDrag.moved += Math.abs(dx) + Math.abs(dy)
        camRight.setFromMatrixColumn(camera.matrixWorld, 0)
        camUp.setFromMatrixColumn(camera.matrixWorld, 1)
        q1.setFromAxisAngle(camUp, dx * 0.0075)
        q2.setFromAxisAngle(camRight, dy * 0.0075)
        R.pointerGroup.quaternion.premultiply(q1).premultiply(q2)
        if (bodyDrag.moved > 90 && !s.rotatedOnce) setState({ rotatedOnce: true })
      } else if (!s.buttonDown && SCREW_MODES.includes(s.mode)) {
        handleScrew(e, s)
      }
    }
    const up = () => {
      if (bodyDrag.active) {
        bodyDrag.active = false
        document.body.style.cursor = ''
      }
      const held =
        import.meta.env.DEV &&
        (window as unknown as Record<string, unknown>).__laserHold === true
      if (getState().buttonDown && !held) {
        click(false)
        releaseButton()
      }
    }
    const handleScrew = (e: PointerEvent, s: State) => {
      if (!R.pointerGroup) return
      const isCap = s.mode === 'cap-unscrewing'
      R.pointerGroup.updateMatrixWorld()
      anchor.set(0, 0, isCap ? -1.7 : 1.9).applyMatrix4(R.pointerGroup.matrixWorld)
      anchor.project(camera)
      const cx = (anchor.x * 0.5 + 0.5) * window.innerWidth
      const cy = (-anchor.y * 0.5 + 0.5) * window.innerHeight
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      if (Math.hypot(dx, dy) < 26) return
      const ang = Math.atan2(-dy, dx)
      if (!screw.current.has) {
        screw.current.has = true
        screw.current.last = ang
        return
      }
      let d = ang - screw.current.last
      if (d > Math.PI) d -= Math.PI * 2
      if (d < -Math.PI) d += Math.PI * 2
      screw.current.last = ang
      if (Math.abs(d) > 1.2) return // pointer jumped across the axis
      const dTravel = d / (Math.PI * 2 * THREAD_TURNS)
      screw.current.acc += Math.abs(d)
      if (screw.current.acc > 0.55) {
        screw.current.acc = 0
        tick()
      }
      if (isCap) {
        const t = THREE.MathUtils.clamp(s.capTravel + dTravel, 0, 1)
        if (t >= 1) {
          setState({ capTravel: 1, mode: 'idle', capLoc: 'fly-off' })
          snap()
        } else {
          setState({ capTravel: t })
        }
      } else {
        const t = THREE.MathUtils.clamp(s.tipTravel + dTravel, 0, 1)
        if (s.mode === 'nozzle-unscrewing' && t >= 1) {
          setState({ tipTravel: 1, mode: 'idle', ejecting: s.tipNozzle, tipNozzle: null })
          snap()
        } else {
          setState({ tipTravel: t })
        }
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [camera])

  // Sit behind + to the button side + above the pointer, and look forward along
  // the barrel so the beam and its pattern read centre-frame. A little mouse
  // parallax keeps the held view alive.
  const computeFirePose = (mouse: THREE.Vector2) => {
    const pg = R.pointerGroup!
    btnDir.set(1, 0, 0).applyQuaternion(pg.quaternion)
    muzDir.set(0, 0, 1).applyQuaternion(pg.quaternion)
    // look toward the pattern, out in front of the muzzle
    fireTarget
      .copy(pg.position)
      .addScaledVector(muzDir, LOOK_AHEAD)
      .addScaledVector(WORLD_UP, LOOK_UP)
    // camera pulled behind the rear, out to the button side, and up
    firePos
      .copy(pg.position)
      .addScaledVector(btnDir, CAM_SIDE)
      .addScaledVector(WORLD_UP, CAM_UP)
      .addScaledVector(muzDir, -CAM_BACK)
    viewDir.subVectors(fireTarget, firePos).normalize()
    sideDir.crossVectors(WORLD_UP, viewDir).normalize()
    firePos.addScaledVector(sideDir, mouse.x * PARALLAX_X).addScaledVector(WORLD_UP, mouse.y * PARALLAX_Y)
  }

  useFrame((state, dt) => {
    const s = getState()
    updateAimTarget()

    if (screw.current.mode !== s.mode) {
      screw.current.mode = s.mode
      screw.current.has = false
      screw.current.acc = 0
    }

    // ---- fire-view camera ----------------------------------------------------
    // While `active`, we fully own the camera: lerp toward the fire framing on
    // press and back to the captured home on release. The lerp runs every frame
    // `active` is set (never gated on progress), so even a huge dt after a lag
    // spike still lands the camera home instead of abandoning it mid-swing.
    const ca = cam.current
    const wantFire = s.buttonDown && laserReady(s) && !!R.pointerGroup
    if (wantFire && !ca.active) {
      ca.active = true
      ca.homePos.copy(camera.position)
      if (R.controls) ca.homeTarget.copy(R.controls.target)
    }
    if (ca.active && R.pointerGroup) {
      if (R.controls) R.controls.enabled = false
      ca.progress = THREE.MathUtils.damp(ca.progress, wantFire ? 1 : 0, 6.5, dt)
      computeFirePose(state.pointer)
      const k = easeInOut(ca.progress)
      camera.position.lerpVectors(ca.homePos, firePos, k)
      tmpTarget.lerpVectors(ca.homeTarget, fireTarget, k)
      camera.lookAt(tmpTarget)
      if (R.controls) R.controls.target.copy(tmpTarget)
      if (!wantFire && ca.progress < 0.002) {
        // fully home — snap exact and hand control back to the user
        camera.position.copy(ca.homePos)
        camera.lookAt(ca.homeTarget)
        if (R.controls) R.controls.target.copy(ca.homeTarget)
        ca.active = false
        ca.progress = 0
      }
    } else if (R.controls) {
      R.controls.enabled = s.mode === 'idle' && !bodyDrag.active && !s.buttonDown
    }

    // ---- click-fallback auto screwing (nozzle in, cap on) --------------------
    if (s.autoNozzle) {
      const t = Math.max(0, s.tipTravel - dt * 1.4)
      autoAcc.current += (s.tipTravel - t) * THREAD_TURNS * Math.PI * 2
      if (autoAcc.current > 0.55) {
        autoAcc.current = 0
        tick()
      }
      if (t <= 0) {
        setState({ tipTravel: 0, autoNozzle: false, mode: 'idle', nozzleCycled: true })
        snap()
      } else {
        setState({ tipTravel: t })
      }
    }
    if (s.autoCap) {
      const t = Math.max(0, s.capTravel - dt * 1.2)
      autoAcc.current += (s.capTravel - t) * THREAD_TURNS * Math.PI * 2
      if (autoAcc.current > 0.55) {
        autoAcc.current = 0
        tick()
      }
      if (t <= 0) {
        setState({ capTravel: 0, autoCap: false })
        snap()
      } else {
        setState({ capTravel: t })
      }
    }
  })

  return null
}
