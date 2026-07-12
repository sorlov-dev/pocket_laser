import { Canvas } from '@react-three/fiber'
import { Scene } from './components/Scene'
import { UI } from './components/UI'
import { ensureAudio } from './audio'
import { cancelModes } from './stateMachine'

let downX = 0
let downY = 0

export default function App() {
  return (
    <div className="app" onPointerDownCapture={(e) => {
      ensureAudio()
      downX = e.clientX
      downY = e.clientY
    }}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ fov: 40, position: [2.7, 1.05, 8.2], near: 0.1, far: 60 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onPointerMissed={(e) => {
          // a genuine click (not the tail end of a circular drag) cancels modes
          if (Math.hypot(e.clientX - downX, e.clientY - downY) < 10) cancelModes()
        }}
      >
        <Scene />
      </Canvas>
      <UI />
    </div>
  )
}
