// Ambient asset types. Kept free of imports and exports so the wildcard module
// declarations stay global. `*.png` is already covered by vite/client.
declare module "*.glb" {
  const source: string
  export default source
}
