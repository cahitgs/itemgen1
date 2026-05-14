import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * Asymmetric hammer/T shape — perpendicular bar + handle. Fully rotation-
 * asymmetric (fold=1), so rotation is a meaningful varying axis.
 *
 * Reads from config.params:
 *   handleLength   — handle length, 0.3–0.8 (fraction of box). Default 0.55.
 *   headWidth      — head bar width, 0.4–0.75. Default 0.6.
 *   headThickness  — head bar thickness, 0.10–0.25. Default 0.18.
 *   markerPos      — corner marker:
 *                       0 = no marker
 *                       1 = top-left
 *                       2 = top-right
 *                       3 = bottom-left
 *                       4 = bottom-right
 *   markerSize     — marker square side, 0.05–0.18. Default 0.10.
 *
 * The marker is rendered in CELL coordinates (does NOT rotate with the hammer),
 * matching the classic Raven puzzle layout where corner glyphs are independent
 * of the main object's orientation.
 */
export function Hammer({ config, box = 100 }: Props) {
  const cx = box / 2
  const cy = box / 2

  const scale = config.size
  const handleLen = clamp(config.params.handleLength ?? 0.55, 0.3, 0.8) * box * scale
  const headW = clamp(config.params.headWidth ?? 0.6, 0.4, 0.75) * box * scale
  const headT = clamp(config.params.headThickness ?? 0.18, 0.1, 0.25) * box * scale
  const handleW = headT * 0.45 // handle is thinner than head

  // Hammer geometry in local coords centered at (cx, cy).
  // Default orientation: head on TOP (horizontal bar), handle going DOWN.
  // We translate so the WHOLE hammer is centered around (cx, cy).
  const totalH = handleLen + headT
  const top = cy - totalH / 2
  const headLeft = cx - headW / 2
  const handleLeft = cx - handleW / 2

  // Two filled rectangles. We use one <path> for crisp corners and easy fill.
  const headPath =
    `M ${headLeft} ${top} ` +
    `h ${headW} ` +
    `v ${headT} ` +
    `h -${headW} ` +
    `z`
  const handlePath =
    `M ${handleLeft} ${top + headT} ` +
    `h ${handleW} ` +
    `v ${handleLen} ` +
    `h -${handleW} ` +
    `z`

  // Marker square in cell coords (NOT rotated).
  const markerPos = Math.round(config.params.markerPos ?? 0)
  const markerSize = clamp(config.params.markerSize ?? 0.1, 0.05, 0.18) * box
  const markerInset = box * 0.08 // distance from cell edge
  const marker = markerPos > 0 ? markerCoords(markerPos, markerSize, markerInset, box) : null

  return (
    <g>
      {/* Rotating part: head + handle */}
      <g
        transform={`rotate(${config.rotation} ${cx} ${cy})`}
      >
        <path
          d={headPath}
          fill={config.fill ?? config.stroke}
          stroke={config.stroke}
          strokeWidth={config.strokeWidth}
          strokeLinejoin="miter"
        />
        <path
          d={handlePath}
          fill={config.fill ?? config.stroke}
          stroke={config.stroke}
          strokeWidth={config.strokeWidth}
          strokeLinejoin="miter"
        />
      </g>

      {/* Marker — outside the rotation group, lives in cell coords */}
      {marker && (
        <rect
          x={marker.x}
          y={marker.y}
          width={markerSize}
          height={markerSize}
          fill={config.stroke}
        />
      )}
    </g>
  )
}

function markerCoords(
  pos: number,
  size: number,
  inset: number,
  box: number,
): { x: number; y: number } {
  switch (pos) {
    case 1: // top-left
      return { x: inset, y: inset }
    case 2: // top-right
      return { x: box - inset - size, y: inset }
    case 3: // bottom-left
      return { x: inset, y: box - inset - size }
    case 4: // bottom-right
      return { x: box - inset - size, y: box - inset - size }
    default:
      return { x: inset, y: inset }
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
