import type { PatternCompletionPuzzle } from '../../types/puzzle'
import { Shape } from '../shapes/Shape'

interface Props {
  puzzle: PatternCompletionPuzzle
  onPick: (index: number) => void
  highlightIndex?: number | null
  highlightKind?: 'correct' | 'wrong'
  onHover?: (index: number) => void
  /** Per-cell pixel size for the fragment preview. Smaller than main grid. */
  cellPx?: number
}

/**
 * Renders the answer-fragment options. Each option is a mini grid of motifs
 * (same dimensions as the blank region in the puzzle). Player clicks one.
 */
export function FragmentOptionPanel({
  puzzle,
  onPick,
  highlightIndex = null,
  highlightKind,
  onHover,
  cellPx = 30,
}: Props) {
  const { motifs, fragmentOptions, blank } = puzzle

  return (
    <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      {fragmentOptions.map((fragment, i) => {
        const isHighlighted = highlightIndex === i
        const highlightCls = isHighlighted
          ? highlightKind === 'correct'
            ? 'ring-2 ring-[var(--color-success)]'
            : 'ring-2 ring-[var(--color-danger)]'
          : 'hover:ring-2 hover:ring-[var(--color-accent)]'
        return (
          <button
            key={i}
            type="button"
            onClick={() => onPick(i)}
            onMouseEnter={() => onHover?.(i)}
            className={`p-2 rounded-lg bg-[var(--color-surface-2)] transition cursor-pointer ${highlightCls}`}
            aria-label={`Option ${i + 1}`}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${blank.cols}, ${cellPx}px)`,
                gridTemplateRows: `repeat(${blank.rows}, ${cellPx}px)`,
              }}
            >
              {fragment.map((row, r) =>
                row.map((motifIdx, c) => (
                  <div
                    key={`${r}-${c}`}
                    style={{ width: cellPx, height: cellPx }}
                  >
                    <Shape config={motifs[motifIdx]} px={cellPx} />
                  </div>
                )),
              )}
            </div>
            <div className="text-center text-xs text-[var(--color-text-muted)] mt-1">
              {i + 1}
            </div>
          </button>
        )
      })}
    </div>
  )
}
