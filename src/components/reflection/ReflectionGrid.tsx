import type { ReflectionPuzzle } from '../../types/puzzle'
import { Shape } from '../shapes/Shape'

interface Props {
  puzzle: ReflectionPuzzle
  /** Pixel size of the source-shape preview. */
  px?: number
}

/**
 * The "question side" of a Reflection puzzle.
 *
 * Shows the source shape next to a dashed line indicating the mirror axis.
 * The dashed line is the symmetry axis the player must reflect across:
 *   horizontal → axis drawn horizontally underneath/above the shape
 *   vertical   → axis drawn vertically beside the shape
 */
export function ReflectionGrid({ puzzle, px = 180 }: Props) {
  const isHorizontal = puzzle.axis === 'horizontal'
  // Axis line geometry — drawn just outside the shape on the mirror side
  const axisStroke = '#f97316'
  const axisLabel = isHorizontal ? 'Yatay eksen' : 'Dikey eksen'
  // Container size: tall for horizontal axis (shape + axis line + reflection
  // hint underneath), wide for vertical axis (shape + axis line beside).
  const cardW = isHorizontal ? px + 24 : px * 2 + 8
  const cardH = isHorizontal ? px * 2 + 8 : px + 24

  return (
    <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col items-center gap-2">
      <div
        className="relative bg-[var(--color-surface-2)] rounded-lg flex items-center justify-center"
        style={{ width: cardW, height: cardH }}
      >
        {isHorizontal ? (
          <div className="flex flex-col items-center">
            <Shape config={puzzle.source} px={px} />
            <div
              className="my-1"
              style={{
                width: px,
                height: 3,
                borderTop: `3px dashed ${axisStroke}`,
              }}
            />
            <div
              className="flex items-center justify-center"
              style={{ width: px, height: px, opacity: 0.18 }}
            >
              {/* Faded mirror hint — player must figure out which option fills here */}
              <span className="text-4xl text-[var(--color-text-muted)]">?</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center">
            <Shape config={puzzle.source} px={px} />
            <div
              className="mx-1"
              style={{
                height: px,
                width: 3,
                borderLeft: `3px dashed ${axisStroke}`,
              }}
            />
            <div
              className="flex items-center justify-center"
              style={{ width: px, height: px, opacity: 0.18 }}
            >
              <span className="text-4xl text-[var(--color-text-muted)]">?</span>
            </div>
          </div>
        )}
      </div>
      <div className="text-xs text-[var(--color-text-muted)]">
        Ayna ekseni: <span className="text-[var(--color-text)] font-medium">{axisLabel}</span>
      </div>
    </div>
  )
}
