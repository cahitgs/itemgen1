import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * Rectangular grid of dots (m×n lattice).
 *
 * Reads from config.params:
 *   rows    — number of dot rows, 1-4
 *   cols    — number of dot columns, 1-4
 *   dotSize — dot radius as fraction of box, 0.04-0.12 (default 0.07)
 *
 * Symmetry:
 *   rows == cols → 90° symmetric (fold=4)
 *   rows != cols → 180° symmetric (fold=2)
 */
export function GridDots({ config, box = 100 }: Props) {
  const cx = box / 2
  const cy = box / 2

  const rows = Math.max(1, Math.min(4, Math.round(config.params.rows ?? 2)))
  const cols = Math.max(1, Math.min(4, Math.round(config.params.cols ?? 2)))
  const dotFrac = Math.max(0.03, Math.min(0.14, config.params.dotSize ?? 0.07))

  const scale = config.size
  // Inner area where dots live — 70% of box, scaled by config.size
  const innerW = box * 0.7 * scale
  const innerH = box * 0.7 * scale
  const dotR = box * dotFrac * scale

  // Distance between adjacent dots; centered when count is 1
  const stepX = cols > 1 ? innerW / (cols - 1) : 0
  const stepY = rows > 1 ? innerH / (rows - 1) : 0
  const startX = cx - (cols > 1 ? innerW / 2 : 0)
  const startY = cy - (rows > 1 ? innerH / 2 : 0)

  const dots: Array<{ x: number; y: number }> = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push({
        x: cols === 1 ? cx : startX + c * stepX,
        y: rows === 1 ? cy : startY + r * stepY,
      })
    }
  }

  return (
    <g transform={`rotate(${config.rotation} ${cx} ${cy})`}>
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={dotR}
          fill={config.fill ?? config.stroke}
          stroke={config.fill ? config.stroke : 'none'}
          strokeWidth={config.fill ? config.strokeWidth : 0}
        />
      ))}
    </g>
  )
}
