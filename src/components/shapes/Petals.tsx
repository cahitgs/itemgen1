import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * Flower-style petals — n rounded petals around the center.
 * Each petal is a thin "leaf" rendered with quadratic Bezier curves.
 *
 * Reads from config.params:
 *   petalCount — number of petals, 3-12
 *   petalWidth — angular half-width of each petal, 0.05-0.30 (radians as fraction of 2π)
 */
export function Petals({ config, box = 100 }: Props) {
  const cx = box / 2
  const cy = box / 2
  const r = (box / 2) * 0.9 * config.size
  const n = Math.max(3, Math.min(12, Math.round(config.params.petalCount ?? 6)))
  const widthFrac = Math.max(0.04, Math.min(0.4, config.params.petalWidth ?? 0.12))
  const halfWidth = widthFrac * 2 * Math.PI

  const petals: string[] = []
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    // Petal path: from center, out along angle, then curved sides back to center
    // Use a path with quadratic Bezier curves for rounded look
    const tipX = cx + r * Math.cos(angle)
    const tipY = cy + r * Math.sin(angle)
    // Control points on either side of the petal
    const ctrl1X = cx + r * 0.5 * Math.cos(angle - halfWidth)
    const ctrl1Y = cy + r * 0.5 * Math.sin(angle - halfWidth)
    const ctrl2X = cx + r * 0.5 * Math.cos(angle + halfWidth)
    const ctrl2Y = cy + r * 0.5 * Math.sin(angle + halfWidth)
    petals.push(
      `M ${cx.toFixed(2)} ${cy.toFixed(2)} Q ${ctrl1X.toFixed(2)} ${ctrl1Y.toFixed(2)}, ${tipX.toFixed(2)} ${tipY.toFixed(2)} Q ${ctrl2X.toFixed(2)} ${ctrl2Y.toFixed(2)}, ${cx.toFixed(2)} ${cy.toFixed(2)} Z`,
    )
  }

  return (
    <g transform={`rotate(${config.rotation} ${cx} ${cy})`}>
      {petals.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={config.fill ?? 'none'}
          stroke={config.stroke}
          strokeWidth={config.strokeWidth}
          strokeLinejoin="round"
        />
      ))}
    </g>
  )
}
