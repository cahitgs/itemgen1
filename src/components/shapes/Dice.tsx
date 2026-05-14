import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * Dice face — dots arranged like a die (1–9).
 *
 * Reads from config.params:
 *   dotCount  — number of dots, 1–9
 *
 * Layout: 3x3 slots, dots placed in canonical die positions.
 */
export function Dice({ config, box = 100 }: Props) {
  const dotCount = Math.max(1, Math.min(9, Math.round(config.params.dotCount ?? 1)))
  const padding = box * 0.15 * config.size
  const cellSize = (box - padding * 2) / 3
  const dotR = cellSize * 0.18

  // Canonical positions used by physical dice. Index = dotCount.
  const POSITIONS: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
    7: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 2]],
    8: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]],
    9: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  }

  const dots = POSITIONS[dotCount].map(([col, row], i) => (
    <circle
      key={i}
      cx={padding + cellSize * (col + 0.5)}
      cy={padding + cellSize * (row + 0.5)}
      r={dotR}
      fill={config.stroke}
    />
  ))

  const cx = box / 2
  return (
    <g transform={`rotate(${config.rotation} ${cx} ${cx})`}>
      {/* Optional border */}
      <rect
        x={padding}
        y={padding}
        width={box - padding * 2}
        height={box - padding * 2}
        fill={config.fill ?? 'none'}
        stroke={config.stroke}
        strokeWidth={config.strokeWidth}
        rx={4}
      />
      {dots}
    </g>
  )
}
