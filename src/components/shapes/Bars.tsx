import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * Parallel bars — N evenly spaced line segments (Raven classic).
 *
 * Reads from config.params:
 *   barCount    — number of bars, 1-6
 *   orientation — 0 = horizontal, 1 = vertical, 2 = diagonal '/'
 *                 (stored as number because ShapeConfig.params is Record<string, number>)
 *
 * Symmetry: parallel bars are 180°-symmetric regardless of orientation,
 *   so rotationSymmetryFold(bars) = 2.
 */
export function Bars({ config, box = 100 }: Props) {
  const cx = box / 2
  const cy = box / 2

  const scale = config.size
  const barCount = Math.max(1, Math.min(6, Math.round(config.params.barCount ?? 3)))
  const orientation = Math.round(config.params.orientation ?? 0) % 3

  // Effective drawing area
  const length = box * 0.8 * scale
  const spread = box * 0.7 * scale // total height/width the bar group spans
  const start = cy - spread / 2

  // Bars are evenly spaced across `spread`. With N bars, gap = spread/(N-1) for
  // N>1; for N=1 we just place a single bar in the middle.
  const positions: number[] = []
  if (barCount === 1) {
    positions.push(cy)
  } else {
    for (let i = 0; i < barCount; i++) {
      positions.push(start + (spread * i) / (barCount - 1))
    }
  }

  // Pre-compute line endpoints in horizontal default; rotate to actual
  // orientation in the wrapping <g>.
  const halfLen = length / 2
  const lines = positions.map((p) => ({
    x1: cx - halfLen,
    y1: p,
    x2: cx + halfLen,
    y2: p,
  }))

  // Map orientation → rotation angle around the cell center.
  //   0 = horizontal (no rotation)
  //   1 = vertical (90°)
  //   2 = diagonal (45°)
  const orientationDeg = orientation === 0 ? 0 : orientation === 1 ? 90 : 45
  const totalRot = orientationDeg + config.rotation

  return (
    <g transform={`rotate(${totalRot} ${cx} ${cy})`}>
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={config.stroke}
          strokeWidth={Math.max(1, config.strokeWidth * 1.5)}
          strokeLinecap="round"
        />
      ))}
    </g>
  )
}
