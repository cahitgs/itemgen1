import type { Matrix3x3Puzzle } from '../../types/puzzle'
import { isBlankCell } from '../../logic/generator'
import { Shape } from '../shapes/Shape'

interface Props {
  puzzle: Matrix3x3Puzzle
  /** Pixel size of each cell. */
  cellPx?: number
}

/**
 * Renders the 3×3 question grid.
 *
 * Cell states:
 *   - "?" at [2][2]: the missing cell the player must fill
 *   - Blank cell (params.blank === 1): used by dist-of-2 puzzles, rendered
 *     as a dashed-border empty box so it's visually part of the rule pattern
 *   - Regular cell: renders the Shape
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
          const isBlank = !isMissing && isBlankCell(cell)

          // Style the cell background — blank cells get a dashed border
          // overlay drawn with inline style (Tailwind doesn't have a clean
          // dashed variant + dynamic color combination here).
          const cellStyle: React.CSSProperties = {
            width: cellPx,
            height: cellPx,
          }
          if (isBlank) {
            cellStyle.border = '2px dashed var(--color-text-muted)'
            cellStyle.background = 'transparent'
          }

          return (
            <div
              key={`${r}-${c}`}
              className={`flex items-center justify-center rounded-lg ${
                isBlank ? '' : 'bg-[var(--color-surface-2)]'
              }`}
              style={cellStyle}
            >
              {isMissing ? (
                <span className="text-5xl font-bold text-[var(--color-text-muted)]">?</span>
              ) : isBlank ? null /* empty cell with dashed border only */ : (
                <Shape config={cell} px={cellPx - 16} />
              )}
            </div>
          )
        }),
      )}
    </div>
  )
}
