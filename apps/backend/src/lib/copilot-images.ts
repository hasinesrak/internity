export const COPILOT_MAX_IMAGES = 3
export const COPILOT_IMAGE_MAX_BYTES = 1024 * 1024
// Accept inline raster data only; never fetch a client-supplied URL.
export function validCopilotImage(dataUrl: string): boolean {
  const match =
    /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      dataUrl
    )
  if (!match || match[2]!.length % 4 !== 0) return false
  const bytes = Buffer.from(match[2]!, "base64")
  if (
    !bytes.length ||
    bytes.length > COPILOT_IMAGE_MAX_BYTES ||
    bytes.toString("base64") !== match[2]
  )
    return false
  switch (match[1]) {
    case "image/png":
      return bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    case "image/jpeg":
      return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    case "image/webp":
      return (
        bytes.subarray(0, 4).toString() === "RIFF" &&
        bytes.subarray(8, 12).toString() === "WEBP"
      )
    default:
      return false
  }
}
