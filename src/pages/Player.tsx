import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PuzzleGrid } from '../components/puzzle/PuzzleGrid'
import { OptionPanel } from '../components/puzzle/OptionPanel'
import {
  sampleAnnulusIdentity,
  sampleAnnulusDistOf3,
  sampleDiceDistOf3,
} from '../logic/generator'
import type { Matrix3x3Puzzle, AnswerLog } from '../types/puzzle'
import { exportAnswersToCsv } from '../utils/csv'

type Status = 'playing' | 'feedback' | 'done'

interface PlayerNavState {
  puzzles?: Matrix3x3Puzzle[]
  testName?: string
}

/**
 * Test runner. Default: 3 sample puzzles (warm-up).
 * If navigated with router state `{ puzzles, testName }` (e.g. from /library),
 * plays that test instead.
 */
export function Player() {
  const location = useLocation()
  const nav = (location.state ?? {}) as PlayerNavState

  // Build the puzzle list once per mount. If a test was passed in via router
  // state, use it; otherwise fall back to the warm-up samples.
  const puzzles = useMemo<Matrix3x3Puzzle[]>(() => {
    if (nav.puzzles && nav.puzzles.length > 0) return nav.puzzles
    return [sampleAnnulusIdentity(), sampleAnnulusDistOf3(), sampleDiceDistOf3()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const testName = nav.testName ?? 'Örnek Test'

  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState<Status>('playing')
  const [picked, setPicked] = useState<number | null>(null)
  const [startTime, setStartTime] = useState<number>(() => Date.now())
  const [answers, setAnswers] = useState<AnswerLog[]>([])
  const [hovers, setHovers] = useState<AnswerLog['hovers']>([])

  const current = puzzles[index]
  const isLast = index === puzzles.length - 1

  function handlePick(chosen: number) {
    if (status !== 'playing') return
    const correct = chosen === current.correctIndex
    const log: AnswerLog = {
      itemId: current.id,
      chosenIndex: chosen,
      correct,
      durationMs: Date.now() - startTime,
      hovers,
    }
    setPicked(chosen)
    setAnswers((a) => [...a, log])
    setStatus('feedback')
  }

  function handleSkip() {
    if (status !== 'playing') return
    const log: AnswerLog = {
      itemId: current.id,
      chosenIndex: -1,
      correct: false,
      durationMs: Date.now() - startTime,
      hovers,
    }
    setAnswers((a) => [...a, log])
    advance()
  }

  function advance() {
    if (isLast) {
      setStatus('done')
      return
    }
    setIndex((i) => i + 1)
    setPicked(null)
    setHovers([])
    setStartTime(Date.now())
    setStatus('playing')
  }

  function handleHover(optionIndex: number) {
    setHovers((h) => [...h, { index: optionIndex, t: Date.now() }])
  }

  function downloadCsv() {
    exportAnswersToCsv(answers, `neocorvus-results-${Date.now()}.csv`)
  }

  if (status === 'done') {
    const correctCount = answers.filter((a) => a.correct).length
    return (
      <div className="min-h-screen p-8 flex flex-col items-center">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-4xl font-light mb-4 text-[var(--color-text)]">Test Tamamlandı</h1>
          <p className="text-xl mb-8 text-[var(--color-text-muted)]">
            Skor: <span className="text-[var(--color-success)] font-medium">{correctCount}</span> / {answers.length}
          </p>

          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 mb-6">
            <table className="w-full text-sm">
              <thead className="text-[var(--color-text-muted)] text-left">
                <tr>
                  <th className="py-2">#</th>
                  <th>Doğru</th>
                  <th>Süre</th>
                  <th>Hover sayısı</th>
                </tr>
              </thead>
              <tbody>
                {answers.map((a, i) => (
                  <tr key={a.itemId} className="border-t border-[var(--color-border)]">
                    <td className="py-2">{i + 1}</td>
                    <td>
                      {a.chosenIndex === -1 ? '⊘ skip' : a.correct ? '✓' : '✗'}
                    </td>
                    <td>{(a.durationMs / 1000).toFixed(1)} sn</td>
                    <td>{a.hovers.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={downloadCsv}
              className="px-6 py-3 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition cursor-pointer"
            >
              CSV İndir
            </button>
            <Link
              to="/"
              className="px-6 py-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition"
            >
              Ana Sayfa
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)]">
            ← Ana Sayfa
          </Link>
          <div className="text-sm text-[var(--color-text-muted)]">
            <span className="text-[var(--color-text)] font-medium">{testName}</span>
            <span className="mx-2 opacity-50">·</span>
            Soru {index + 1} / {puzzles.length}
          </div>
          <button
            type="button"
            onClick={handleSkip}
            disabled={status !== 'playing'}
            className="text-sm text-[var(--color-accent)] hover:underline disabled:opacity-40"
          >
            Bu soruyu atla
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
          <PuzzleGrid puzzle={current} />
          <div className="flex flex-col gap-4 items-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Sağdaki seçeneklerden eksik hücreye uyanı seç:
            </p>
            <OptionPanel
              puzzle={current}
              onPick={handlePick}
              onHover={handleHover}
              highlightIndex={picked}
              highlightKind={
                picked !== null
                  ? picked === current.correctIndex
                    ? 'correct'
                    : 'wrong'
                  : undefined
              }
            />
            {status === 'feedback' && (
              <button
                type="button"
                onClick={advance}
                className="mt-4 px-6 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition cursor-pointer"
              >
                {isLast ? 'Bitir' : 'Sonraki Soru →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
