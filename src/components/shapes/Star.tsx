import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * N-pointed star (alternating outer and inner vertices).
 *
 * Reads from config.params:
 *   points     — number of star tips, 4-10
 *   innerRatio — inner radius / outer radius, 0.2-0.6 (lower = sharper points)
 */
export function Star({ config, box = 100 }: Props) {
  const cx = box / 2
  const cy = box / 2
  const rOuter = (box / 2) * 0.9 * config.size
  const points = Math.max(4, Math.min(10, Math.round(config.params.points ?? 5)))
  const innerRatio = Math.max(0.2, Math.min(0.7, config.params.innerRatio ?? 0.4))
  const rInner = rOuter * innerRatio

  // 2n vertices alternating outer/inner
  const verts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * 2 * Math.PI - Math.PI / 2
    const r = i % 2 === 0 ? rOuter : rInner
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    verts.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }

  return (
    <g transform={`rotate(${config.rotation} ${cx} ${cy})`}>
      <polygon
        points={verts.join(' ')}
        fill={config.fill ?? 'none'}
        stroke={config.stroke}
        strokeWidth={config.strokeWidth}
        strokeLinejoin="round"
      />
    </g>
  )
}
