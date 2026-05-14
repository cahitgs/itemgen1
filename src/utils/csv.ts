import Papa from 'papaparse'
import type { AnswerLog } from '../types/puzzle'

/**
 * Convert answer logs to a CSV and trigger a browser download.
 * One row per answer; hover events compressed to "idx@deltaMs;..." form.
 */
export function exportAnswersToCsv(answers: AnswerLog[], filename: string): void {
  const rows = answers.map((a, i) => ({
    questionNumber: i + 1,
    itemId: a.itemId,
    chosenIndex: a.chosenIndex,
    skipped: a.chosenIndex === -1,
    correct: a.correct,
    durationMs: a.durationMs,
    hoverCount: a.hovers.length,
    hoverTrace: a.hovers
      .map((h, k) => {
        const delta = k === 0 ? 0 : h.t - a.hovers[k - 1].t
        return `${h.index}@${delta}`
      })
      .join(';'),
  }))

  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
