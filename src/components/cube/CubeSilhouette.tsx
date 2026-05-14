interface Props {
  /** Row-major bit grid. 1 = filled, 0 = empty. */
  grid: number[][]
  /** Render size in px (square viewport). */
  px?: number
  /** Optional fill color override for filled cells. */
  fill?: string
  /** Stroke color for cell outlines. */
  stroke?: string
}

/**
 * 2D silhouette renderer for Cube Projection answer choices.
 *
 * Renders the bit grid as a tightly-packed square grid where filled cells
 * are colored blocks and empty cells show just an outline. Mimics the
 * visual style of the reference PDF (purple filled squares on a pale
 * background).
 *
 * Adapted from `Checkerboard.tsx` — same inset rectangle trick to keep
 * adjacent filled cells visually distinct without merging.
 */
export function CubeSilhouette({
  grid,
  px = 120,
  fill = '#7c3aed',
  stroke = '#cbd5e1',
}: Props) {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  if (rows === 0 || cols === 0) return null

  // Use the larger dimension to determine cell size so the silhouette fits
  // in a px × px box centered, with a small margin.
  const margin = px * 0.06
  const inner = px - margin * 2
  const cell = Math.floor(inner / Math.max(rows, cols))
  const totalW = cell * cols
  const totalH = cell * rows
  const startX = (px - totalW) / 2
  const startY = (px - totalH) / 2

  // Slight inset so adjacent filled cells have a visible gap (same
  // mechanism as Checkerboard.tsx).
  const inset = Math.max(0.8, cell * 0.08)
  const outline = Math.max(0.6, cell * 0.05)

  return (
    <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} xmlns="http://www.w3.org/2000/svg">
      {grid.map((row, r) =>
        row.map((v, c) => {
          const x = startX + c * cell
          const y = startY + r * cell
          return (
            <g key={`${r}-${c}`}>
              <rect
                x={x}
                y={y}
                width={cell}
                height={cell}
                fill="none"
                stroke={stroke}
                strokeWidth={outline}
              />
              {v === 1 && (
                <rect
                  x={x + inset}
                  y={y + inset}
                  width={cell - inset * 2}
                  height={cell - inset * 2}
                  fill={fill}
                />
              )}
            </g>
          )
        }),
      )}
    </svg>
  )
}
