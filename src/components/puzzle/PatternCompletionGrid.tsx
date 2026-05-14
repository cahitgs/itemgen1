import type { PatternCompletionPuzzle } from '../../types/puzzle'
import { Shape } from '../shapes/Shape'

interface Props {
  puzzle: PatternCompletionPuzzle
  /** Per-cell pixel size; controls overall grid dimensions. */
  cellPx?: number
}

/**
 * Renders the big pattern grid with a rectangular blank.
 * Cells inside the blank are hidden; the blank is overlaid with a subtle
 * highlighted rectangle to draw the eye.
 */
export function PatternCompletionGrid({ puzzle, cellPx = 42 }: Props) {
  const { motifs, pattern, blank } = puzzle
  const rows = pattern.length
  const cols = pattern[0]?.length ?? 0

  return (
    <div
      className="relative rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-3"
      style={{ width: 'fit-content' }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
          position: 'relative',
        }}
      >
        {pattern.map((row, r) =>
          row.map((motifIdx, c) => {
            const inBlank = isInsideBlank(r, c, blank)
            return (
              <div
                key={`${r}-${c}`}
                style={{
                  width: cellPx,
                  height: cellPx,
                  visibility: inBlank ? 'hidden' : 'visible',
                }}
              >
                <Shape config={motifs[motifIdx]} px={cellPx} />
              </div>
            )
          }),
        )}

        {/* Blank overlay — visually emphasized empty rectangle */}
        <div
          style={{
            position: 'absolute',
            left: blank.col * cellPx,
            top: blank.row * cellPx,
            width: blank.cols * cellPx,
            height: blank.rows * cellPx,
            background: 'var(--color-surface-2)',
            border: '2px dashed var(--color-accent)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="text-3xl font-bold text-[var(--color-text-muted)]"
            style={{ opacity: 0.6 }}
          >
            ?
          </span>
        </div>
      </div>
    </div>
  )
}

function isInsideBlank(
  r: number,
  c: number,
  blank: { row: number; col: number; rows: number; cols: number },
): boolean {
  return (
    r >= blank.row &&
    r < blank.row + blank.rows &&
    c >= blank.col &&
    c < blank.col + blank.cols
  )
}
