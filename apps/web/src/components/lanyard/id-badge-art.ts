// Draws the badge artwork the Lanyard model wears: the card's front and back
// faces and the repeating ribbon texture.
//
// The card is a printed object, so its colours are fixed neutrals rather than
// theme tokens — flipping the app theme does not repaint a badge on a desk.
// The only colour that varies is the organization's own logo, which an admin
// sets. When no logo is set, a monogram mark is drawn in its place.

export interface BadgeArtInput {
  /** The name printed on the card. */
  name: string
  /** The line under the name, e.g. "Intern · Design Studio". */
  label: string
  /** Organization name, printed on the ribbon and the card's back. */
  organization: string
  /** Admin-set organization logo. Falls back to a monogram when missing. */
  logoUrl: string | null
}

export interface BadgeArt {
  /** Data URLs, or `null` when the face keeps the model's baked texture. */
  front: string | null
  back: string | null
  band: string | null
}

// The GLB's 1678px atlas gives each card face roughly 840px of width. Render
// close to that native size so text stays sharp without keeping a 2x texture
// in memory for every face.
const ART_SCALE = 1.75
const FACE_W = 512 * ART_SCALE
const FACE_H = 776 * ART_SCALE
const BAND_W = 1024 * ART_SCALE
const BAND_H = 256 * ART_SCALE

// Neutrals, mirroring the token ramp in packages/ui/src/styles/globals.css.
const CARD_BG = "#ffffff"
const INK = "#171717"
const INK_MUTED = "#6f6f6f"
const HAIRLINE = "#e6e6e6"
const BAND_BG = "#171717"
const BAND_INK = "#ffffff"

const FONT = "'Manrope Variable', system-ui, sans-serif"

const artCache = new Map<string, Promise<BadgeArt>>()

function createSurface(width: number, height: number) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  return ctx ? { canvas, ctx } : null
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    // Admin-set logos may live on another origin; anonymous keeps the canvas
    // untainted so the data URL can be produced.
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

function drawContained(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.min(width / image.width, height / image.height)
  const dw = image.width * scale
  const dh = image.height * scale
  ctx.drawImage(image, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh)
}

function initialsOf(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const first = parts[0]?.charAt(0) ?? ""
  const second =
    parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : ""
  return (first + second).toUpperCase() || "•"
}

/** Stand-in mark when an admin has not uploaded a logo yet. */
function drawMonogram(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number
) {
  ctx.save()
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, size * 0.22)
  ctx.fill()
  ctx.fillStyle = CARD_BG
  ctx.font = `700 ${Math.round(size * 0.4)}px ${FONT}`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(initialsOf(name), x + size / 2, y + size / 2 + 1)
  ctx.restore()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  const last = kept.length - 1
  kept[last] = `${(kept[last] ?? "").replace(/\s+\S*$/, "")}…`
  return kept
}

function drawName(
  ctx: CanvasRenderingContext2D,
  name: string,
  center: number,
  top: number,
  maxWidth: number
) {
  ctx.save()
  ctx.fillStyle = INK
  ctx.textAlign = "center"
  ctx.textBaseline = "top"

  let size = 62 * ART_SCALE
  let lines: string[] = []
  for (const candidate of [62, 52, 44, 36].map((value) => value * ART_SCALE)) {
    size = candidate
    ctx.font = `700 ${size}px ${FONT}`
    lines = wrapText(ctx, name, maxWidth, 2)
    if (lines.length === 1 && ctx.measureText(name).width <= maxWidth) break
    if (lines.length <= 2) break
  }

  const lineHeight = Math.round(size * 1.18)
  lines.forEach((line, index) => {
    ctx.fillText(line, center, top + index * lineHeight, maxWidth)
  })
  ctx.restore()
  return lines.length * lineHeight
}

function drawFront(
  logo: HTMLImageElement | null,
  input: BadgeArtInput,
  ctx: CanvasRenderingContext2D
) {
  ctx.fillStyle = CARD_BG
  ctx.fillRect(0, 0, FACE_W, FACE_H)

  // Brand mark, or its monogram stand-in, in the card's upper third.
  if (logo) {
    drawContained(
      ctx,
      logo,
      (FACE_W - 260 * ART_SCALE) / 2,
      120 * ART_SCALE,
      260 * ART_SCALE,
      168 * ART_SCALE
    )
  } else {
    const size = 132 * ART_SCALE
    drawMonogram(
      ctx,
      input.organization,
      (FACE_W - size) / 2,
      140 * ART_SCALE,
      size
    )
  }

  const usedHeight = drawName(
    ctx,
    input.name,
    FACE_W / 2,
    430 * ART_SCALE,
    FACE_W - 88 * ART_SCALE
  )

  ctx.save()
  ctx.fillStyle = INK_MUTED
  ctx.font = `600 ${27 * ART_SCALE}px ${FONT}`
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  ctx.fillText(
    input.label,
    FACE_W / 2,
    430 * ART_SCALE + usedHeight + 18 * ART_SCALE,
    FACE_W - 96 * ART_SCALE
  )
  ctx.restore()

  ctx.fillStyle = HAIRLINE
  ctx.fillRect(
    FACE_W / 2 - 110 * ART_SCALE,
    686 * ART_SCALE,
    220 * ART_SCALE,
    3 * ART_SCALE
  )
}

function drawBack(
  logo: HTMLImageElement | null,
  input: BadgeArtInput,
  ctx: CanvasRenderingContext2D
) {
  ctx.fillStyle = CARD_BG
  ctx.fillRect(0, 0, FACE_W, FACE_H)

  if (logo) {
    drawContained(
      ctx,
      logo,
      (FACE_W - 300 * ART_SCALE) / 2,
      220 * ART_SCALE,
      300 * ART_SCALE,
      200 * ART_SCALE
    )
  } else {
    const size = 156 * ART_SCALE
    drawMonogram(
      ctx,
      input.organization,
      (FACE_W - size) / 2,
      240 * ART_SCALE,
      size
    )
  }

  ctx.save()
  ctx.fillStyle = INK_MUTED
  ctx.font = `600 ${25 * ART_SCALE}px ${FONT}`
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  ctx.fillText(
    input.organization,
    FACE_W / 2,
    500 * ART_SCALE,
    FACE_W - 88 * ART_SCALE
  )
  ctx.restore()

  ctx.fillStyle = HAIRLINE
  ctx.fillRect(
    FACE_W / 2 - 110 * ART_SCALE,
    686 * ART_SCALE,
    220 * ART_SCALE,
    3 * ART_SCALE
  )
}

function drawBand(input: BadgeArtInput, ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = BAND_BG
  ctx.fillRect(0, 0, BAND_W, BAND_H)

  ctx.save()
  ctx.fillStyle = BAND_INK
  ctx.font = `600 ${58 * ART_SCALE}px ${FONT}`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  const tracked = input.organization.toUpperCase()
  // One name per tile, centred, with symmetric separators so the texture
  // repeats without a visible seam along the ribbon.
  ctx.fillText(tracked, BAND_W / 2, BAND_H / 2 + 2, BAND_W * 0.72)
  ctx.restore()

  ctx.save()
  ctx.fillStyle = BAND_INK
  ctx.translate(96 * ART_SCALE, BAND_H / 2)
  ctx.rotate(Math.PI / 4)
  ctx.fillRect(-9 * ART_SCALE, -9 * ART_SCALE, 18 * ART_SCALE, 18 * ART_SCALE)
  ctx.restore()
  ctx.save()
  ctx.fillStyle = BAND_INK
  ctx.translate(BAND_W - 96 * ART_SCALE, BAND_H / 2)
  ctx.rotate(Math.PI / 4)
  ctx.fillRect(-9 * ART_SCALE, -9 * ART_SCALE, 18 * ART_SCALE, 18 * ART_SCALE)
  ctx.restore()
}

function toDataUrl(canvas: HTMLCanvasElement): string | null {
  try {
    return canvas.toDataURL("image/png")
  } catch {
    // A logo served without CORS taints the canvas; keep the baked texture.
    return null
  }
}

/**
 * Builds the three badge textures. The logo is loaded once and shared by both
 * faces; when it is missing the faces carry a monogram instead.
 */
export function buildBadgeArt(input: BadgeArtInput): Promise<BadgeArt> {
  const key = JSON.stringify(input)
  const cached = artCache.get(key)
  if (cached) return cached

  const pending = createBadgeArt(input)
  artCache.set(key, pending)
  return pending
}

async function createBadgeArt(input: BadgeArtInput): Promise<BadgeArt> {
  if (typeof document === "undefined") {
    return { front: null, back: null, band: null }
  }

  // Canvas text should land in Manrope, the product typeface.
  try {
    await document.fonts.ready
  } catch {
    // Font loading is best effort; system-ui is the fallback in `FONT`.
  }

  const logo = input.logoUrl ? await loadImage(input.logoUrl) : null

  const frontSurface = createSurface(FACE_W, FACE_H)
  const backSurface = createSurface(FACE_W, FACE_H)
  const bandSurface = createSurface(BAND_W, BAND_H)
  if (!frontSurface || !backSurface || !bandSurface) {
    return { front: null, back: null, band: null }
  }

  drawFront(logo, input, frontSurface.ctx)
  drawBack(logo, input, backSurface.ctx)
  drawBand(input, bandSurface.ctx)

  return {
    front: toDataUrl(frontSurface.canvas),
    back: toDataUrl(backSurface.canvas),
    band: toDataUrl(bandSurface.canvas),
  }
}
