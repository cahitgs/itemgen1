import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * Regular polygon (triangle, square, pentagon, hexagon, ...).
 *
 * Reads from config.params:
 *   sides — number of sides, 3-12
 */
export function Polygon({ config, box = 100 }: Props) {
  const cx = box / 2
  const cy = box / 2
  const r = (box / 2) * 0.85 * config.size
  const sides = Math.max(3, Math.min(12, Math.round(config.params.sides ?? 3)))

  // Vertices on a circle, starting from the top
  const points: string[] = []
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * 2 * Math.PI - Math.PI / 2
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }

  return (
    <g transform={`rotate(${config.rotation} ${cx} ${cy})`}>
      <polygon
        points={points.join(' ')}
        fill={config.fill ?? 'none'}
        stroke={config.stroke}
        strokeWidth={config.strokeWidth}
        strokeLinejoin="round"
      />
    </g>
  )
}
