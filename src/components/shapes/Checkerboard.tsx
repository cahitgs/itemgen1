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

  // Inset for the inner filled block. Leaves a visible gap so adjacent
  // filled cells never merge into a single solid rectangle.
  const inset = Math.max(1.5, Math.min(cellW, cellH) * 0.12)
  const outlineW = Math.max(0.8, config.strokeWidth * 0.6)

  return (
    <g transform={`rotate(${config.rotation} ${cx} ${cy})`}>
      {cells.map((cell, i) => {
        const x = startX + cell.c * cellW
        const y = startY + cell.r * cellH
        return (
          <g key={i}>
            {/* Outline — always drawn, defines the cell border */}
            <rect
              x={x}
              y={y}
              width={cellW}
              height={cellH}
              fill="none"
              stroke={config.stroke}
              strokeWidth={outlineW}
            />
            {/* Inner filled block — only for filled cells. Inset on all sides
                so two adjacent filled cells have a clear visible gap. */}
            {cell.filled && (
              <rect
                x={x + inset}
                y={y + inset}
                width={cellW - inset * 2}
                height={cellH - inset * 2}
                fill={config.stroke}
              />
            )}
          </g>
        )
      })}
    </g>
  )
}
