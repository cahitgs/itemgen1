import type { Matrix3x3Puzzle } from '../../types/puzzle'
import { Shape } from '../shapes/Shape'

interface Props {
  puzzle: Matrix3x3Puzzle
  /** Pixel size of each cell. */
  cellPx?: number
}

/**
 * Renders the 3×3 question grid.
 * The bottom-right cell (row 2, col 2) is shown as a "?" placeholder.
 */
export function PuzzleGrid({ puzzle, cellPx = 110 }: Props) {
  return (
    <div
      className="grid grid-cols-3 gap-2 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]"
      style={{ width: 'fit-content' }}
    >
      {puzzle.cells.flatMap((row, r) =>
        row.map((cell, c) => {
          const isMissing = r === 2 && c === 2
          return (
            <div
              key={`${r}-${c}`}
              className="flex items-center justify-center rounded-lg bg-[var(--color-surface-2)]"
              style={{ width: cellPx, height: cellPx }}
            >
              {isMissing ? (
                <span className="text-5xl font-bold text-[var(--color-text-muted)]">?</span>
              ) : (
                <Shape config={cell} px={cellPx - 16} />
              )}
            </div>
          )
        }),
      )}
    </div>
  )
}
