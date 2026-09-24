export {}

// meshline registers its geometry and material through R3F's `extend`; without
// these two element names JSX does not know them. Their props are meshline's
// own, so they stay open.
declare module "@react-three/fiber" {
  interface ThreeElements {
    meshLineGeometry: Record<string, unknown>
    meshLineMaterial: Record<string, unknown>
  }
}
