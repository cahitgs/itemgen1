import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * Box-Lines — square outline with selected internal lines (legacy Corvus shape).
 *
 * Reads from config.params:
 *   lineMask — 6-bit integer; each bit toggles one internal line:
 *     bit 0: top  edge midpoint → center (vertical down half)
 *     bit 1: right edge midpoint → center (horizontal left half)
 *     bit 2: bottom edge midpoint → center (vertical up half)
 *     bit 3: left edge midpoint → center (horizontal right half)
 *     bit 4: top-left → bottom-right diagonal
 *     bit 5: top-right → bottom-left diagonal
 *
 * Symmetry: depends on the bit-mask. Conservatively report fold=1 so
 * visualSignature distinguishes all rotations.
 */
export function BoxLines({ config, box = 100 }: Props) {
  const cx = box / 2
  const cy = box / 2

  const scale = config.size
  const half = box * 0.4 * scale     // half of box side (square is 80% × scale)
  const left = cx - half
  const right = cx + half
  const top = cy - half
  const bottom = cy + half

  const mask = Math.max(0, Math.min(63, Math.round(config.params.lineMask ?? 0)))
  const sw = Math.max(0.8, config.strokeWidth)

  // Build the list of internal line segments
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  if (mask & 1)  lines.push({ x1: cx, y1: top,    x2: cx, y2: cy })     // top→center
  if (mask & 2)  lines.push({ x1: right, y1: cy, x2: cx, y2: cy })      // right→center
  if (mask & 4)  lines.push({ x1: cx, y1: bottom, x2: cx, y2: cy })     // bottom→center
  if (mask & 8)  lines.push({ x1: left, y1: cy,  x2: cx, y2: cy })      // left→center
  if (mask & 16) lines.push({ x1: left, y1: top, x2: right, y2: bottom }) // \ diagonal
  if (mask & 32) lines.push({ x1: right, y1: top, x2: left, y2: bottom }) // / diagonal

  return (
    <g transform={`rotate(${config.rotation} ${cx} ${cy})`}>
      {/* Outer square frame */}
      <rect
        x={left}
        y={top}
        width={half * 2}
        height={half * 2}
        fill={config.fill ?? 'none'}
        stroke={config.stroke}
        strokeWidth={sw}
      />
      {/* Internal lines */}
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={config.stroke}
          strokeWidth={sw}
        />
      ))}
    </g>
  )
}
