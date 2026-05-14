import type { CubeProjectionPuzzle } from '../../types/puzzle'
import { CubeStack } from './CubeStack'

interface Props {
  puzzle: CubeProjectionPuzzle
  /** Optional render size for the cube stack. */
  stackPx?: number
}

const AXIS_LABEL: Record<string, string> = {
  top: 'üstten',
  front: 'önden',
  back: 'arkadan',
  left: 'soldan',
  right: 'sağdan',
}

/**
 * The "question side" of a Cube Projection puzzle — shows the 3D stack
 * with the question-axis arrow. The answer choices live in a separate
 * component (`CubeOptionPanel`) so Player can wire click handling +
 * highlight independently (mirrors the 3×3 grid + OptionPanel split).
 */
export function CubePuzzleGrid({ puzzle, stackPx = 220 }: Props) {
  const axisLabel = AXIS_LABEL[puzzle.questionAxis] ?? puzzle.questionAxis
  return (
    <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col items-center gap-2">
      <CubeStack cubes={puzzle.cubes} questionAxis={puzzle.questionAxis} px={stackPx} />
      <div className="text-xs text-[var(--color-text-muted)]">
        Bakış yönü: <span className="text-[var(--color-text)] font-medium">{axisLabel}</span>
      </div>
    </div>
  )
}
