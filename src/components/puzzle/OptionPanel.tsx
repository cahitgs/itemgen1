import type { Matrix3x3Puzzle } from '../../types/puzzle'
import { Shape } from '../shapes/Shape'

interface Props {
  puzzle: Matrix3x3Puzzle
  onPick: (index: number) => void
  /** Optional: highlight an option (e.g. after submit). */
  highlightIndex?: number | null
  highlightKind?: 'correct' | 'wrong'
  /** Track hover events for analytics. */
  onHover?: (index: number) => void
  cellPx?: number
}

/**
 * The grid of answer options the user picks from.
 *
 * Unlike Corvus, options are visible from the start.
 * Hover is tracked separately (for behavior analytics) — no concealment trick.
 */
export function OptionPanel({
  puzzle,
  onPick,
  highlightIndex = null,
  highlightKind,
  onHover,
  cellPx = 100,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      {puzzle.options.map((opt, i) => {
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
            className={`flex items-center justify-center rounded-lg bg-[var(--color-surface-2)] transition cursor-pointer ${highlightCls}`}
            style={{ width: cellPx, height: cellPx }}
            aria-label={`Option ${i + 1}`}
          >
            <Shape config={opt} px={cellPx - 16} />
          </button>
        )
      })}
    </div>
  )
}
