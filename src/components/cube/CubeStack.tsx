import type { ProjectionAxis } from '../../types/puzzle'

interface Props {
  /** Voxel positions [x, y, z] of all cubes in the stack. */
  cubes: Array<[number, number, number]>
  /** Axis the player is asked to project to — drawn as an arrow + dot. */
  questionAxis: ProjectionAxis
  /** Render width/height in px. */
  px?: number
}

// Isometric color palette (PDF reference: shades of purple).
const COLOR_TOP = '#b8a3f8'    // brightest face (lit from above)
const COLOR_RIGHT = '#7c3aed'  // mid (lit from the right)
const COLOR_FRONT = '#5b21b6'  // darkest (in shadow)
const STROKE = '#3b0a73'
const STROKE_W = 0.8

const COS30 = Math.cos(Math.PI / 6) // ≈ 0.866
const SIN30 = 0.5

/**
 * Isometric 3D cube-stack renderer.
 *
 * Coordinate system:
 *   3D: x → right, y → into-the-screen (depth), z → up
 *   Camera at (+x, +y, +z) octant looking back at the origin → the three
 *   visible faces of every cube are TOP (+z), RIGHT (+x), FRONT (+y).
 *
 * Painter's algorithm: cubes are sorted by (x + y + z) ascending so the
 * farthest cube draws first and nearer cubes overdraw it correctly.
 *
 * The question-axis arrow is drawn on the edge of the viewport, pointing
 * into the stack — visual cue for "look from this direction".
 */
export function CubeStack({ cubes, questionAxis, px = 220 }: Props) {
  if (cubes.length === 0) {
    return <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} />
  }

  // Fit the stack into the viewport: compute screen-space bounds, pick a
  // unit size and offset so the whole structure is centered with margin.
  const allCorners = cubes.flatMap(([x, y, z]) =>
    [
      [x, y, z], [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z],
      [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1],
    ] as Array<[number, number, number]>,
  )
  const projected = allCorners.map(([x, y, z]) => isoProject(x, y, z, 1))
  const minX = Math.min(...projected.map((p) => p.X))
  const maxX = Math.max(...projected.map((p) => p.X))
  const minY = Math.min(...projected.map((p) => p.Y))
  const maxY = Math.max(...projected.map((p) => p.Y))
  const spanX = maxX - minX
  const spanY = maxY - minY
  // Leave a generous margin so the question-axis arrow has room outside the stack
  const margin = px * 0.16
  const fit = Math.min((px - 2 * margin) / spanX, (px - 2 * margin) / spanY)
  const unit = fit
  const cx = px / 2 - ((minX + maxX) / 2) * unit
  const cy = px / 2 - ((minY + maxY) / 2) * unit

  const project = (x: number, y: number, z: number) => {
    const { X, Y } = isoProject(x, y, z, 1)
    return { sx: cx + X * unit, sy: cy + Y * unit }
  }

  // Painter's algorithm: farthest cube (smallest x+y+z) first
  const sorted = [...cubes].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))

  // Helper: render one cube's three visible faces (top, right, front).
  // The hidden bottom-back-left corner (p000) is unused — we never draw
  // the −z, −x, −y faces because they always face away from the camera.
  const renderCube = (x: number, y: number, z: number) => {
    // 7 visible-face corners of the unit cube at (x..x+1, y..y+1, z..z+1)
    const p100 = project(x + 1, y, z)
    const p110 = project(x + 1, y + 1, z)
    const p010 = project(x, y + 1, z)
    const p001 = project(x, y, z + 1)
    const p101 = project(x + 1, y, z + 1)
    const p111 = project(x + 1, y + 1, z + 1)
    const p011 = project(x, y + 1, z + 1)

    // TOP face (+z): corners p001 p101 p111 p011
    const topPath = polygon([p001, p101, p111, p011])
    // RIGHT face (+x): corners p100 p110 p111 p101
    const rightPath = polygon([p100, p110, p111, p101])
    // FRONT face (+y): corners p010 p110 p111 p011
    const frontPath = polygon([p010, p110, p111, p011])

    return (
      <g key={`${x}-${y}-${z}`}>
        {/* Order matters: top last so its outline is crisp */}
        <polygon points={rightPath} fill={COLOR_RIGHT} stroke={STROKE} strokeWidth={STROKE_W} />
        <polygon points={frontPath} fill={COLOR_FRONT} stroke={STROKE} strokeWidth={STROKE_W} />
        <polygon points={topPath} fill={COLOR_TOP} stroke={STROKE} strokeWidth={STROKE_W} />
      </g>
    )
  }

  // Compute stack bounding box in screen coordinates (so the arrow can be
  // anchored at the relevant edge of the actual rendered stack, not at the
  // edge of the viewport).
  const stackBox = {
    left: cx + minX * unit,
    right: cx + maxX * unit,
    top: cy + minY * unit,
    bottom: cy + maxY * unit,
  }
  const arrow = arrowForAxis(questionAxis, px, stackBox)

  return (
    <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} xmlns="http://www.w3.org/2000/svg">
      {/* Subtle background card */}
      <rect x={1} y={1} width={px - 2} height={px - 2} rx={6} fill="#fcd9b6" opacity={0.25} />

      {sorted.map(([x, y, z]) => renderCube(x, y, z))}

      {/* Question-axis arrow + dot */}
      <g>
        <circle cx={arrow.fromX} cy={arrow.fromY} r={4.5} fill="#f97316" />
        <line
          x1={arrow.fromX}
          y1={arrow.fromY}
          x2={arrow.toX}
          y2={arrow.toY}
          stroke="#f97316"
          strokeWidth={2.5}
          markerEnd="url(#cube-arrowhead)"
        />
        <defs>
          <marker id="cube-arrowhead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" />
          </marker>
        </defs>
      </g>
    </svg>
  )
}

// ──────────────────────────────────────────────────────────────
// Geometry helpers
// ──────────────────────────────────────────────────────────────

function isoProject(x: number, y: number, z: number, unit: number) {
  // Standard 2:1 isometric projection
  return {
    X: (x - y) * COS30 * unit,
    Y: (x + y) * SIN30 * unit - z * unit,
  }
}

function polygon(pts: Array<{ sx: number; sy: number }>): string {
  return pts.map((p) => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ')
}

/**
 * Compute where to draw the question-axis arrow.
 *
 * The arrow is placed in 2D screen space (NOT projected from 3D) so its
 * position matches the player's intuition for the axis label:
 *   - "top"   → arrow comes from the top of the viewport, pointing down at the stack
 *   - "left"  → arrow comes from the left edge,  pointing right at the stack
 *   - "right" → arrow comes from the right edge, pointing left at the stack
 *   - "front" → arrow comes from the bottom-right (where the +y axis exits
 *               the isometric scene), pointing into the stack
 *   - "back"  → arrow comes from the top-left (where the +y axis enters
 *               the isometric scene), pointing into the stack
 *
 * Anchored at the relevant edge of the stack's screen bounding box so the
 * tip lands right next to the cubes regardless of where they sit in the
 * viewport.
 */
function arrowForAxis(
  axis: ProjectionAxis,
  px: number,
  box: { left: number; right: number; top: number; bottom: number },
): { fromX: number; fromY: number; toX: number; toY: number } {
  const margin = 10
  const gap = 6 // distance between arrow tip and stack edge
  const cx = (box.left + box.right) / 2
  const cy = (box.top + box.bottom) / 2

  switch (axis) {
    case 'top':
      return {
        fromX: cx,
        fromY: margin,
        toX: cx,
        toY: Math.max(margin + 18, box.top - gap),
      }
    case 'left':
      return {
        fromX: margin,
        fromY: cy,
        toX: Math.max(margin + 18, box.left - gap),
        toY: cy,
      }
    case 'right':
      return {
        fromX: px - margin,
        fromY: cy,
        toX: Math.min(px - margin - 18, box.right + gap),
        toY: cy,
      }
    case 'front':
      // Bottom-right corner of viewport → toward the bottom-right of the
      // stack (the +y / +x corner in isometric projection).
      return {
        fromX: px - margin,
        fromY: px - margin,
        toX: Math.min(px - margin - 18, box.right + gap),
        toY: Math.min(px - margin - 18, box.bottom + gap),
      }
    case 'back':
      // Top-left corner of viewport → toward the top-left of the stack
      // (the −y / −x corner in isometric projection).
      return {
        fromX: margin,
        fromY: margin,
        toX: Math.max(margin + 18, box.left - gap),
        toY: Math.max(margin + 18, box.top - gap),
      }
  }
}
