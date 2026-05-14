import type { CubeProjectionPuzzle } from '../../types/puzzle'
import { CubeSilhouette } from './CubeSilhouette'

interface Props {
  puzzle: CubeProjectionPuzzle
  onPick: (index: number) => void
  highlightIndex?: number | null
  highlightKind?: 'correct' | 'wrong'
  onHover?: (index: number) => void
  /** Pixel size per option silhouette. */
  cellPx?: number
}

/**
 * Answer panel for Cube Projection puzzles. 2×2 grid of silhouette
 * choices, each click-to-pick. Mirrors the `OptionPanel.tsx` pattern
 * (highlight after submit, hover analytics, etc.).
 */
export function CubeOptionPanel({
  puzzle,
  onPick,
  highlightIndex = null,
  highlightKind,
  onHover,
  cellPx = 140,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
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
            className={`relative flex items-center justify-center rounded-lg bg-[var(--color-surface-2)] transition cursor-pointer ${highlightCls}`}
            style={{ width: cellPx, height: cellPx }}
            aria-label={`Option ${String.fromCharCode(65 + i)}`}
          >
            <span className="absolute top-1.5 left-2 text-xs font-semibold text-[var(--color-text-muted)]">
              {String.fromCharCode(65 + i)}
            </span>
            <CubeSilhouette grid={opt.grid} px={cellPx - 20} />
          </button>
        )
      })}
    </div>
  )
}
