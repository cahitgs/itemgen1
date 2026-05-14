import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * Directional arrow. Default points up (rotation 0 = up).
 * Rotation is the key parameter — this shape is fully asymmetric.
 *
 * Reads from config.params:
 *   headRatio  — head length as fraction of total length, 0.3-0.6 (default 0.4)
 *   shaftWidth — shaft thickness as fraction of arrow width, 0.2-0.6 (default 0.35)
 */
export function Arrow({ config, box = 100 }: Props) {
  const cx = box / 2
  const cy = box / 2
  const r = (box / 2) * 0.85 * config.size

  const headRatio = Math.max(0.25, Math.min(0.7, config.params.headRatio ?? 0.4))
  const shaftWidth = Math.max(0.15, Math.min(0.6, config.params.shaftWidth ?? 0.35))

  // Arrow geometry in local coords: pointing up, tip at (0, -r), base at (0, +r)
  // Total length = 2r, width = 2 * r * 0.7
  const totalLen = 2 * r
  const headLen = totalLen * headRatio
  const W = r * 0.7        // half-width of arrow head
  const shaftHalf = W * shaftWidth

  // Polygon points (clockwise from top tip):
  //   tip → right head edge → right shoulder → right shaft bottom →
  //   left shaft bottom → left shoulder → left head edge → tip
  const top = -r                  // tip y
  const headBottom = top + headLen
  const bottom = top + totalLen
  const pts = [
    [0, top],                     // tip
    [W, headBottom],              // right head edge
    [shaftHalf, headBottom],      // right shoulder (inset)
    [shaftHalf, bottom],          // right shaft bottom
    [-shaftHalf, bottom],         // left shaft bottom
    [-shaftHalf, headBottom],     // left shoulder
    [-W, headBottom],             // left head edge
  ]
    .map(([x, y]) => `${(cx + x).toFixed(2)},${(cy + y).toFixed(2)}`)
    .join(' ')

  return (
    <g transform={`rotate(${config.rotation} ${cx} ${cy})`}>
      <polygon
        points={pts}
        fill={config.fill ?? 'none'}
        stroke={config.stroke}
        strokeWidth={config.strokeWidth}
        strokeLinejoin="round"
      />
    </g>
  )
}
