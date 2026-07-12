import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { R, isPortrait } from '../refs'
import { GestureManager } from './GestureManager'
import { Pointer } from './Pointer'
import { Nozzles } from './Nozzle'
import { BatterySystem } from './BatteryBay'
import { Beam } from './Beam'
import { Projection } from './Projection'

export function Scene() {
  return (
    <>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.07} />
      <directionalLight position={[3.5, 5, 3]} intensity={1.15} />
      {/* procedural studio lighting — no downloaded HDRs */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.8} position={[0, 4, 2.5]} scale={[7, 2.5, 1]} rotation-x={-Math.PI / 6} />
        <Lightformer form="rect" intensity={1.3} position={[-4, 1, 3]} scale={[2, 4, 1]} rotation-y={0.9} />
        <Lightformer form="rect" intensity={1.7} position={[5, 0.5, -2]} scale={[2, 5, 1]} rotation-y={-1.2} />
        <Lightformer form="rect" intensity={1.6} position={[-5, 2.5, -1]} scale={[3, 3, 1]} rotation-y={1.2} />
        <Lightformer form="circle" intensity={0.5} position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={[9, 9, 1]} color="#333344" />
      </Environment>

      <GestureManager />
      <Pointer />
      <Nozzles />
      <BatterySystem />
      <Beam />
      <Projection />

      <OrbitControls
        ref={(c) => {
          R.controls = c as unknown as typeof R.controls
        }}
        target={[0.35, -0.05, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.2}
        maxDistance={isPortrait() ? 14 : 11}
        maxPolarAngle={1.62}
        minPolarAngle={0.25}
      />

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.8} luminanceThreshold={1} luminanceSmoothing={0.2} radius={0.5} />
      </EffectComposer>
    </>
  )
}
