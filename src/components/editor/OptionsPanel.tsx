import type { ShapeConfig } from '../../types/puzzle'
import { Shape } from '../shapes/Shape'
import { makeDistinctDistractors } from '../../logic/generator'
import { mulberry32, randomSeed } from '../../logic/rng'

interface Props {
  /** The correct answer (cells[2][2] for 3x3 puzzles). */
  correct: ShapeConfig
  /** Current option list (must include correct at correctIndex). */
  options: ShapeConfig[]
  correctIndex: number
  /** Other cells used as siblings for distractor seeding. */
  siblings: ShapeConfig[]
  onChange: (options: ShapeConfig[], correctIndex: number) => void
}

/**
 * Shows the 4 answer-choice tiles and offers a "regenerate distractors" button.
 * The correct answer is always derived from `correct` and stays at the marked
 * position. Distractors come from makeDistinctDistractors, seeded each click.
 *
 * The user can also click a tile to mark it as the "correct" one (rarely needed
 * but useful if they want to scramble the answer slot manually).
 */
export function OptionsPanel({ correct, options, correctIndex, siblings, onChange }: Props) {
  const regenerate = () => {
    const seed = randomSeed()
    const rng = mulberry32(seed)
    const distractors = makeDistinctDistractors(rng, correct, siblings, 3)
    // Build new options: correct + 3 distractors, then shuffle position of correct
    const all = [correct, ...distractors]
    // Place correct at a random index 0..3
    const idx = Math.floor(rng() * all.length)
    const shuffled: ShapeConfig[] = []
    let placed = 0
    for (let i = 0; i < all.length; i++) {
      if (i === idx) {
        shuffled.push(correct)
      } else {
        // distractors[placed++] (skipping correct slot)
        shuffled.push(distractors[placed++])
      }
    }
    onChange(shuffled, idx)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-[var(--color-text)]">Cevap Şıkları</h3>
        <button
          type="button"
          onClick={regenerate}
          className="text-xs px-2 py-1 rounded border border-[var(--color-border)] hover:border-[var(--color-accent)] transition"
          title="Çeldiricileri yeniden üretir (doğru cevap aynı kalır, ama konumu değişir)"
        >
          🎲 Çeldirici Üret
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {options.map((opt, i) => {
          const isCorrect = i === correctIndex
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                // Mark this option as the correct one
                onChange(options, i)
              }}
              className={`relative flex items-center justify-center rounded-lg border-2 p-1 transition ${
                isCorrect
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                  : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
              }`}
              title={isCorrect ? 'Doğru cevap (tıkla = farklı şıkkı doğru yap)' : 'Bu şıkkı doğru olarak işaretle'}
            >
              <Shape config={opt} px={72} />
              <span className="absolute top-1 left-1 text-[10px] font-bold text-[var(--color-text-muted)]">
                {String.fromCharCode(65 + i)}
              </span>
              {isCorrect && (
                <span className="absolute top-1 right-1 text-[10px] font-bold text-[var(--color-accent)]">
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-[var(--color-text-muted)] mt-2">
        Yeşil daireli şık doğru cevaptır. Farklı bir şıkkı doğru yapmak için üzerine tıkla.
      </p>
    </div>
  )
}
