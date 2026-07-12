import * as THREE from 'three'
import { getKnurlTexture } from './textures/sprites'

// Shared material singletons — the whole object family reuses these.
export const goldMat = new THREE.MeshStandardMaterial({
  color: '#deae35',
  metalness: 1,
  roughness: 0.24,
  envMapIntensity: 1.25,
})

export const goldKnurlMat = new THREE.MeshStandardMaterial({
  color: '#d3a52f',
  metalness: 1,
  roughness: 0.32,
  roughnessMap: getKnurlTexture(),
  envMapIntensity: 1.6,
})

export const yellowMat = new THREE.MeshPhysicalMaterial({
  color: '#f6bb05',
  roughness: 0.34,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.12,
  envMapIntensity: 0.9,
})

export const boreMat = new THREE.MeshStandardMaterial({
  color: '#241c08',
  roughness: 0.9,
  metalness: 0.2,
  side: THREE.BackSide,
})

export const blackPlasticMat = new THREE.MeshStandardMaterial({
  color: '#131313',
  roughness: 0.55,
  metalness: 0,
  envMapIntensity: 0.5,
})

export const foamMat = new THREE.MeshStandardMaterial({
  color: '#e8c419',
  roughness: 0.95,
  metalness: 0,
  envMapIntensity: 0.35,
})

export const slotMat = new THREE.MeshStandardMaterial({
  color: '#6b5a0d',
  roughness: 1,
  metalness: 0,
})

// Per-nozzle slight tint variation so they read as individual pieces.
export const nozzleMats = ['#e2b342', '#d9a72e', '#e6ba4d', '#d2a02a'].map(
  (c) =>
    new THREE.MeshStandardMaterial({
      color: c,
      metalness: 1,
      roughness: 0.18,
      envMapIntensity: 1.7,
    })
)
