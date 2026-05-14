import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * Nested polygon — outer regular polygon with a smaller polygon inside.
 *
 * Reads from config.params:
 *   outerSides — outer polygon side count, 3-8
 *   innerSides — inner polygon side count, 3-8
 *   innerScale — inner size relative to outer, 0.3-0.7 (default 0.5)
 *
 * Symmetry: gcd(outerSides, innerSides). For safety, fold = min(outer, inner).
 */
export function NestedPolygon({ config, box = 100 }: Props) {
  const cx = box / 2
  const cy = box / 2
  const scale = config.size
  const outerR = (box / 2) * 0.9 * scale
  const outerSides = Math.max(3, Math.min(8, Math.round(config.params.outerSides ?? 4)))
  const innerSides = Math.max(3, Math.min(8, Math.round(config.params.innerSides ?? 4)))
  const innerScale = Math.max(0.25, Math.min(0.75, config.params.innerScale ?? 0.5))
  const innerR = outerR * innerScale

  const makePoly = (sides: number, r: number) => {
    const pts: string[] = []
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * 2 * Math.PI - Math.PI / 2
      pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
    }
    return pts.join(' ')
  }

  return (
    <g transform={`rotate(${config.rotation} ${cx} ${cy})`}>
      <polygon
        points={makePoly(outerSides, outerR)}
        fill={config.fill ?? 'none'}
        stroke={config.stroke}
        strokeWidth={config.strokeWidth}
        strokeLinejoin="round"
      />
      <polygon
        points={makePoly(innerSides, innerR)}
        fill="none"
        stroke={config.stroke}
        strokeWidth={config.strokeWidth}
        strokeLinejoin="round"
      />
    </g>
  )
}
