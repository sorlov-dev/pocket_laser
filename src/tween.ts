import * as THREE from 'three'

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// Pose tween for parts that fly between the pointer and the box/floor.
// Captures the start pose from the object itself, interpolates toward a live
// target with a small arc, reports completion.
export class PoseTween {
  active = false
  private t = 0
  private dur = 0.75
  private arc = 0.55
  private startPos = new THREE.Vector3()
  private startQ = new THREE.Quaternion()

  begin(obj: THREE.Object3D, dur = 0.75, arc = 0.55) {
    this.startPos.copy(obj.position)
    this.startQ.copy(obj.quaternion)
    this.t = 0
    this.dur = dur
    this.arc = arc
    this.active = true
  }

  /** Returns true on the frame the tween completes. */
  step(dt: number, targetPos: THREE.Vector3, targetQ: THREE.Quaternion, out: THREE.Object3D): boolean {
    if (!this.active) return false
    this.t += dt / this.dur
    const done = this.t >= 1
    const k = easeInOut(Math.min(this.t, 1))
    out.position.lerpVectors(this.startPos, targetPos, k)
    out.position.y += Math.sin(Math.PI * k) * this.arc
    out.quaternion.slerpQuaternions(this.startQ, targetQ, k)
    if (done) this.active = false
    return done
  }
}
