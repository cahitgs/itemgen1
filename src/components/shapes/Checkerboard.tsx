import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * Checkerboard / filled-cell grid — m×n grid where each cell is either filled
 * or empty, controlled by a bit-mask integer.
 *
 * Reads from config.params:
 *   rows       — grid rows, 1-4
 *   cols       — grid cols, 1-4
 *   pattern    — bit-mask integer; bit i represents cell (r,c) where
 *                i = r * cols + c. So pattern=0 is fully empty, pattern=2^(r*c)-1
 *                is fully filled, and intermediate values give various fills.
 *
 * Symmetry: depends on the pattern's own symmetry under rotation; we
 * conservatively report fold=1 (no symmetry assumed) so visualSignature
 * treats every rotation distinctly. This keeps dedup safe.
 */
export function Checkerboard({ config, box = 100 }: Props) {
  const cx = box / 2
  const cy = box / 2

  const rows = Math.max(1, Math.min(4, Math.round(config.params.rows ?? 3)))
  const cols = Math.max(1, Math.min(4, Math.round(config.params.cols ?? 3)))
  const totalCells = rows * cols
  const maxPattern = (1 << totalCells) - 1
  const pattern = Math.max(0, Math.min(maxPattern, Math.round(config.params.pattern ?? 0)))

  const scale = config.size
  // Inner area shrinks to leave margin
  const innerW = box * 0.78 * scale
  const innerH = box * 0.78 * scale
  const cellW = innerW / cols
  const cellH = innerH / rows
  const startX = cx - innerW / 2
  const startY = cy - innerH / 2

  // Render every cell as an outlined rect; filled cells get the stroke color
  const cells: Array<{ r: number; c: number; filled: boolean }> = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bitIdx = r * cols + c
      cells.push({ r, c, filled: (pattern & (1 << bitIdx)) !== 0 })
    }
  }

  return (
    <g transform={`rotate(${config.rotation} ${cx} ${cy})`}>
      {cells.map((cell, i) => (
        <rect
          key={i}
          x={startX + cell.c * cellW}
          y={startY + cell.r * cellH}
          width={cellW}
          height={cellH}
          fill={cell.filled ? config.stroke : 'none'}
          stroke={config.stroke}
          strokeWidth={Math.max(0.5, config.strokeWidth * 0.6)}
        />
      ))}
    </g>
  )
}
