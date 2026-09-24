// React Bits — Lanyard (JavaScript + CSS variant), ported to TypeScript.
// Source: https://reactbits.dev/components/lanyard (MIT, DavidHDev/react-bits)
// Keep the internals faithful to upstream; the wrapper sizing lives in
// lanyard.css and the card faces are supplied at runtime by id-badge-art.ts.
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import type { RefObject } from "react"
import { Canvas, extend, useFrame } from "@react-three/fiber"
import type { ThreeEvent } from "@react-three/fiber"
import {
  Environment,
  Lightformer,
  useGLTF,
  useTexture,
} from "@react-three/drei"
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from "@react-three/rapier"
import type { RapierRigidBody } from "@react-three/rapier"
import { MeshLineGeometry, MeshLineMaterial } from "meshline"
import * as THREE from "three"

import cardGLB from "../../assets/lanyard/card.glb"
import lanyardBand from "../../assets/lanyard/lanyard.png"

import "./lanyard.css"

extend({ MeshLineGeometry, MeshLineMaterial })

export interface LanyardProps {
  /** Initial camera position for the canvas. */
  position?: [number, number, number]
  /** Gravity vector for the physics simulation. */
  gravity?: [number, number, number]
  /** Camera field of view. */
  fov?: number
  /** Enables a transparent background for the canvas. */
  transparent?: boolean
  /** Custom image for the card's front face. Falls back to the model texture. */
  frontImage?: string | null
  /** Custom image for the card's back face, rendered independently. */
  backImage?: string | null
  /** How a custom front/back image fits its face. Both preserve aspect. */
  imageFit?: "cover" | "contain"
  /** Custom repeating texture for the lanyard band. */
  lanyardImage?: string | null
  /** Band width (meshline lineWidth). Wider leaves a custom band more room. */
  lanyardWidth?: number
}

// 1x1 transparent pixel — lets useTexture be called unconditionally when a
// front/back image isn't supplied.
const BLANK_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

// The card model's front face is UV-mapped to the LEFT half of the texture
// atlas and the back face to the RIGHT half (measured from card.glb). Each
// custom image is composited into its own half so the two faces render
// independently, aspect-preserving (no stretching).
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 }
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.757 }

type CardGLTF = {
  nodes: {
    card: THREE.Mesh
    clip: THREE.Mesh
    clamp: THREE.Mesh
  }
  materials: {
    base: THREE.MeshStandardMaterial
    metal: THREE.MeshStandardMaterial
  }
}

type SegmentBody = RapierRigidBody & { lerped?: THREE.Vector3 }

// React 19 types `useRef<T>(null)` as `RefObject<T | null>`, while rapier's
// joints read a populated `RefObject<RigidBody>`. R3F fills these refs before
// the joints first run.
function asBodyRef(ref: RefObject<SegmentBody | null>) {
  return ref as RefObject<RapierRigidBody>
}

export default function Lanyard({
  position = [0, 0, 30],
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true,
  frontImage = null,
  backImage = null,
  imageFit = "cover",
  lanyardImage = null,
  lanyardWidth = 1,
}: LanyardProps) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  )

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="lanyard-wrapper">
      <Canvas
        camera={{ position: position, fov: fov }}
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ alpha: transparent }}
        onCreated={({ gl }) =>
          gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)
        }
      >
        <ambientLight intensity={Math.PI} />
        {/* useGLTF and Physics both suspend: keep their boundary inside the
            canvas so the page shell never falls back to client rendering. */}
        <Suspense fallback={null}>
          <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
            <Band
              isMobile={isMobile}
              frontImage={frontImage}
              backImage={backImage}
              imageFit={imageFit}
              lanyardImage={lanyardImage}
              lanyardWidth={lanyardWidth}
            />
          </Physics>
        </Suspense>
        <Environment blur={0.75}>
          <Lightformer
            intensity={2}
            color="white"
            position={[0, -1, 5]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[-1, -1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[1, 1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={10}
            color="white"
            position={[-10, 0, 14]}
            rotation={[0, Math.PI / 2, Math.PI / 3]}
            scale={[100, 10, 1]}
          />
        </Environment>
      </Canvas>
    </div>
  )
}

interface BandProps {
  maxSpeed?: number
  minSpeed?: number
  isMobile?: boolean
  frontImage?: string | null
  backImage?: string | null
  imageFit?: "cover" | "contain"
  lanyardImage?: string | null
  lanyardWidth?: number
}

function Band({
  maxSpeed = 50,
  minSpeed = 0,
  isMobile = false,
  frontImage = null,
  backImage = null,
  imageFit = "cover",
  lanyardImage = null,
  lanyardWidth = 1,
}: BandProps) {
  const band = useRef<THREE.Mesh>(null)
  const fixed = useRef<SegmentBody>(null)
  const j1 = useRef<SegmentBody>(null)
  const j2 = useRef<SegmentBody>(null)
  const j3 = useRef<SegmentBody>(null)
  const card = useRef<SegmentBody>(null)
  // Scratch vectors, allocated once: the component re-renders on drag/hover
  // state and must not allocate per render for per-frame math.
  const [vec] = useState(() => new THREE.Vector3())
  const [ang] = useState(() => new THREE.Vector3())
  const [rot] = useState(() => new THREE.Vector3())
  const [dir] = useState(() => new THREE.Vector3())
  const segmentProps = {
    type: "dynamic" as const,
    canSleep: true,
    colliders: false as const,
    angularDamping: 4,
    linearDamping: 4,
  }
  const { nodes, materials } = useGLTF(cardGLB) as unknown as CardGLTF
  const texture = useTexture(lanyardImage || lanyardBand)
  // useTexture must be called unconditionally; use a blank pixel when an image
  // isn't supplied for a given face, then skip compositing it below.
  const frontTex = useTexture(frontImage || BLANK_PIXEL)
  const backTex = useTexture(backImage || BLANK_PIXEL)

  // Composite the front/back images into the card's texture atlas (front = left
  // half, back = right half). Each image is drawn aspect-preserving (no stretch).
  const cardMap = useMemo(() => {
    const baseMap = materials.base.map
    if (!frontImage && !backImage) return baseMap
    if (!baseMap?.image) return baseMap

    const baseImg = baseMap.image as HTMLImageElement
    const W = baseImg.width
    const H = baseImg.height
    const canvas = document.createElement("canvas")
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext("2d")
    if (!ctx) return baseMap
    // Keep the original baked atlas for the card edges and any untouched face.
    ctx.drawImage(baseImg, 0, 0, W, H)

    const drawFitted = (
      img: HTMLImageElement,
      rect: { x: number; y: number; w: number; h: number }
    ) => {
      const rx = rect.x * W
      const ry = rect.y * H
      const rw = rect.w * W
      const rh = rect.h * H
      const pick = imageFit === "contain" ? Math.min : Math.max
      const scale = pick(rw / img.width, rh / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      const dx = rx + (rw - dw) / 2
      const dy = ry + (rh - dh) / 2
      ctx.save()
      ctx.beginPath()
      ctx.rect(rx, ry, rw, rh)
      ctx.clip()
      ctx.drawImage(img, dx, dy, dw, dh)
      ctx.restore()
    }

    if (frontImage && frontTex.image) {
      drawFitted(frontTex.image as HTMLImageElement, FRONT_UV_RECT)
    }
    if (backImage && backTex.image) {
      drawFitted(backTex.image as HTMLImageElement, BACK_UV_RECT)
    }

    const composite = new THREE.CanvasTexture(canvas)
    composite.colorSpace = THREE.SRGBColorSpace
    composite.flipY = baseMap.flipY
    composite.anisotropy = 16
    composite.needsUpdate = true
    return composite
  }, [frontImage, backImage, imageFit, frontTex, backTex, materials.base.map])
  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
  )
  const [dragged, drag] = useState<THREE.Vector3 | false>(false)
  const [hovered, hover] = useState(false)

  useRopeJoint(asBodyRef(fixed), asBodyRef(j1), [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(asBodyRef(j1), asBodyRef(j2), [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(asBodyRef(j2), asBodyRef(j3), [[0, 0, 0], [0, 0, 0], 1])
  useSphericalJoint(asBodyRef(j3), asBodyRef(card), [
    [0, 0, 0],
    [0, 1.5, 0],
  ])

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? "grabbing" : "grab"
      return () => {
        document.body.style.cursor = "auto"
      }
    }
    return undefined
  }, [hovered, dragged])

  useFrame((state, delta) => {
    if (dragged && card.current) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      vec.add(dir.multiplyScalar(state.camera.position.length()))
      ;[card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp())
      card.current.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      })
    }
    if (
      fixed.current &&
      j1.current &&
      j2.current &&
      j3.current &&
      card.current &&
      band.current
    ) {
      ;[j1, j2].forEach((ref) => {
        const body = ref.current
        if (!body) return
        if (!body.lerped) {
          body.lerped = new THREE.Vector3().copy(body.translation())
        }
        const clampedDistance = Math.max(
          0.1,
          Math.min(1, body.lerped.distanceTo(body.translation()))
        )
        body.lerped.lerp(
          body.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
        )
      })
      curve.points[0].copy(j3.current.translation())
      curve.points[1].copy(j2.current.lerped as THREE.Vector3)
      curve.points[2].copy(j1.current.lerped as THREE.Vector3)
      curve.points[3].copy(fixed.current.translation())
      ;(band.current.geometry as MeshLineGeometry).setPoints(
        curve.getPoints(isMobile ? 16 : 32)
      )
      ang.copy(card.current.angvel())
      rot.copy(card.current.rotation())
      // Upstream omits rapier's `wake` flag here and it reads as false, so the
      // card settles without being woken every frame.
      card.current.setAngvel(
        {
          x: ang.x,
          y: ang.y - rot.y * 0.25,
          z: ang.z,
        },
        false
      )
    }
  })

  curve.curveType = "chordal"
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    const point = event.target as Element
    point.setPointerCapture(event.pointerId)
    const body = card.current
    if (!body) return
    drag(
      new THREE.Vector3().copy(event.point).sub(vec.copy(body.translation()))
    )
  }

  const onPointerUp = (event: ThreeEvent<PointerEvent>) => {
    const point = event.target as Element
    point.releasePointerCapture(event.pointerId)
    drag(false)
  }

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={onPointerUp}
            onPointerDown={onPointerDown}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={cardMap}
                map-anisotropy={16}
                clearcoat={isMobile ? 0 : 1}
                clearcoatRoughness={0.15}
                roughness={0.9}
                metalness={0.8}
              />
            </mesh>
            <mesh
              geometry={nodes.clip.geometry}
              material={materials.metal}
              material-roughness={0.3}
            />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white"
          depthTest={false}
          resolution={isMobile ? [1000, 2000] : [1000, 1000]}
          useMap
          map={texture}
          repeat={[-4, 1]}
          lineWidth={lanyardWidth}
        />
      </mesh>
    </>
  )
}
