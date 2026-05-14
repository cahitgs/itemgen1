import type { FoldDirection, PaperFoldingPuzzle } from '../../types/puzzle'
import { foldedDimensions } from '../../logic/paperFolding'

interface Props {
  puzzle: PaperFoldingPuzzle
  /** Pixel width of the largest (original) paper diagram. */
  paperPx?: number
}

const PAPER_BG = '#ffffff'
const PAPER_BORDER = '#1f2937'
const PAPER_GRID = '#cbd5e1'
const HOLE_COLOR = '#1f2937'
const ARROW_COLOR = '#f97316'

const FOLD_LABEL: Record<FoldDirection, string> = {
  right: 'Sağa katla',
  left: 'Sola katla',
  up: 'Yukarı katla',
  down: 'Aşağı katla',
}

/**
 * Question-side diagram for a Paper Folding puzzle.
 *
 * Layout (left → right):
 *   [original paper]  ↦ [paper after fold 1]  ↦ [paper after fold 2 + hole]
 *
 * Each step shrinks the paper along the fold axis. The final diagram shows
 * a single punched hole on the folded paper. Arrows between diagrams label
 * the fold direction.
 */
export function PaperFoldingGrid({ puzzle, paperPx = 110 }: Props) {
  const { rows, cols, folds, hole } = puzzle

  // Build the list of intermediate paper dimensions: after fold 0, after fold 1, …
  const stages: Array<{ rows: number; cols: number }> = [{ rows, cols }]
  for (let i = 0; i < folds.length; i++) {
    stages.push(foldedDimensions(rows, cols, folds.slice(0, i + 1)))
  }

  return (
    <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {stages.map((stage, i) => {
          const isLast = i === stages.length - 1
          const showHole = isLast
          // Scale down each subsequent diagram a little so the eye reads
          // them as "smaller paper" rather than "different paper".
          const sizeFactor = i === 0 ? 1 : 0.85 - (i - 1) * 0.05
          const px = Math.max(50, paperPx * sizeFactor)
          return (
            <div key={i} className="flex items-center gap-2">
              <PaperDiagram
                rows={stage.rows}
                cols={stage.cols}
                holes={showHole ? [hole] : []}
                px={px}
              />
              {i < folds.length && (
                <FoldArrow direction={folds[i]} label={FOLD_LABEL[folds[i]]} />
              )}
            </div>
          )
        })}
      </div>
      <div className="text-xs text-[var(--color-text-muted)] text-center max-w-md">
        Kağıt {folds.length} kez katlanmış, sonra ortadaki <strong>nokta</strong>{' '}
        gibi delinmiş. Açılınca delikler nereye gelir?
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────

interface PaperProps {
  rows: number
  cols: number
  holes: Array<{ row: number; col: number }>
  px: number
}

/** Reusable paper-grid renderer. Used in both the question diagram and the
 *  option panel. */
export function PaperDiagram({ rows, cols, holes, px }: PaperProps) {
  if (rows < 1 || cols < 1) {
    return <div style={{ width: px, height: px }} />
  }
  // Paper aspect ratio = cols / rows. Fit inside a px × px box.
  const aspectW = cols
  const aspectH = rows
  const maxDim = Math.max(aspectW, aspectH)
  const cellSize = px / Math.max(maxDim, 4) // anchor to original 4×4 size so folded diagrams are smaller
  const paperW = cellSize * aspectW
  const paperH = cellSize * aspectH
  const padding = 4

  return (
    <svg
      width={paperW + padding * 2}
      height={paperH + padding * 2}
      viewBox={`0 0 ${paperW + padding * 2} ${paperH + padding * 2}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Paper background */}
      <rect
        x={padding}
        y={padding}
        width={paperW}
        height={paperH}
        fill={PAPER_BG}
        stroke={PAPER_BORDER}
        strokeWidth={2}
        rx={2}
      />
      {/* Grid lines (subtle) */}
      {Array.from({ length: rows - 1 }).map((_, i) => (
        <line
          key={`hg-${i}`}
          x1={padding}
          y1={padding + (i + 1) * cellSize}
          x2={padding + paperW}
          y2={padding + (i + 1) * cellSize}
          stroke={PAPER_GRID}
          strokeWidth={0.5}
        />
      ))}
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <line
          key={`vg-${i}`}
          x1={padding + (i + 1) * cellSize}
          y1={padding}
          x2={padding + (i + 1) * cellSize}
          y2={padding + paperH}
          stroke={PAPER_GRID}
          strokeWidth={0.5}
        />
      ))}
      {/* Holes */}
      {holes.map((h, i) => {
        const cx = padding + h.col * cellSize + cellSize / 2
        const cy = padding + h.row * cellSize + cellSize / 2
        const r = Math.max(2, cellSize * 0.25)
        return <circle key={i} cx={cx} cy={cy} r={r} fill={HOLE_COLOR} />
      })}
    </svg>
  )
}

interface ArrowProps {
  direction: FoldDirection
  label: string
}

function FoldArrow({ direction, label }: ArrowProps) {
  // Single horizontal arrow pointing right, with a label showing the actual
  // fold direction (the arrow is just visual flow — the text says what kind).
  // We tilt the arrow body slightly to match the fold direction for an
  // intuitive hint:  → / ← / ↓ / ↑
  const symbol =
    direction === 'right' ? '→'
      : direction === 'left' ? '←'
      : direction === 'up' ? '↑'
      : '↓'
  return (
    <div className="flex flex-col items-center gap-1 px-1">
      <span style={{ fontSize: 22, color: ARROW_COLOR, lineHeight: 1 }}>{symbol}</span>
      <span className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">{label}</span>
    </div>
  )
}
