import type { OddOneOutPuzzle } from '../../types/puzzle'
import { Shape } from '../shapes/Shape'

interface Props {
  puzzle: OddOneOutPuzzle
  onPick: (index: number) => void
  highlightIndex?: number | null
  highlightKind?: 'correct' | 'wrong'
  onHover?: (index: number) => void
  cellPx?: number
}

/**
 * Odd-one-out player panel. Shows N items in a row; clicking one selects it
 * as the "different" item. No "?" cell — every item is both a question and
 * an option.
 */
export function OddOneOutPanel({
  puzzle,
  onPick,
  highlightIndex = null,
  highlightKind,
  onHover,
  cellPx = 110,
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
            aria-label={`Item ${i + 1}`}
          >
            <Shape config={opt} px={cellPx - 16} />
          </button>
        )
      })}
    </div>
  )
}
