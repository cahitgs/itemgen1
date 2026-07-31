import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ShapeConfig, Matrix3x3Puzzle, ShapeKind } from '../types/puzzle'
import { Shape } from '../components/shapes/Shape'
import { CellEditor } from '../components/editor/CellEditor'
import { OptionsPanel } from '../components/editor/OptionsPanel'
import { PuzzleGrid } from '../components/puzzle/PuzzleGrid'
import { randomBaseShape, makeDistinctDistractors } from '../logic/generator'
import { mulberry32, randomSeed } from '../logic/rng'
import { saveTest } from '../db/dexie'
import { useT } from '../i18n'

type CellCoord = [number, number]

/** Make a single fresh ShapeConfig as a sane starting point. */
function makeStarterCell(kind: ShapeKind = 'polygon'): ShapeConfig {
  // Use a deterministic-ish seed so the first render is stable
  const rng = mulberry32(42)
  return randomBaseShape(kind, rng)
}

/** Build a 3×3 grid where every cell is a clone of the seed. */
function uniformGrid(seed: ShapeConfig): ShapeConfig[][] {
  const cells: ShapeConfig[][] = []
  for (let r = 0; r < 3; r++) {
    const row: ShapeConfig[] = []
    for (let c = 0; c < 3; c++) {
      row.push({ ...seed, params: { ...seed.params } })
    }
    cells.push(row)
  }
  return cells
}

/**
 * Manual puzzle editor — hand-craft a 3×3 puzzle cell-by-cell.
 *
 * Flow:
 *   1) Pick any cell to edit it in the right panel (cells[2][2] is the answer).
 *   2) Click "Çeldirici Üret" to generate 3 distinct distractors.
 *   3) Click any option tile to mark it as the correct answer (rarely needed).
 *   4) Name the test and save it to the library.
 */
export function Editor() {
  const t = useT()
  const navigate = useNavigate()

  // Initial state: identity-like — all 9 cells identical (a sane "fill-in" start)
  const [cells, setCells] = useState<ShapeConfig[][]>(() => uniformGrid(makeStarterCell()))
  const [selected, setSelected] = useState<CellCoord>([2, 2]) // start on the answer
  const [options, setOptions] = useState<ShapeConfig[]>(() => {
    // Initial dummy distractors so the bottom panel isn't empty
    const seed = makeStarterCell()
    const rng = mulberry32(7)
    const distractors = makeDistinctDistractors(rng, seed, [], 3)
    return [seed, ...distractors]
  })
  const [correctIndex, setCorrectIndex] = useState(0)
  const [testName, setTestName] = useState(() => t('Özel Soru'))
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Helpers
  const correct = cells[2][2]
  const siblings = useMemo(
    () =>
      cells.flatMap((row, r) =>
        row.flatMap((cell, c) => (r === 2 && c === 2 ? [] : [cell])),
      ),
    [cells],
  )

  // Keep options[correctIndex] in sync with cells[2][2] (the source of truth)
  useEffect(() => {
    setOptions((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      next[correctIndex] = { ...correct, params: { ...correct.params } }
      return next
    })
  }, [correct, correctIndex])

  const updateCell = (r: number, c: number, next: ShapeConfig) => {
    setCells((prev) => {
      const out = prev.map((row) => row.slice())
      out[r][c] = next
      return out
    })
  }

  const fillAllFromSelected = () => {
    const seed = cells[selected[0]][selected[1]]
    setCells(uniformGrid(seed))
  }

  const randomizeAll = () => {
    const rng = mulberry32(randomSeed())
    setCells((prev) => prev.map((row) => row.map(() => randomBaseShape(prev[0][0].kind, rng))))
  }

  const resetAll = () => {
    setCells(uniformGrid(makeStarterCell()))
    setSelected([2, 2])
  }

  // ── Build puzzle for the live preview (mirrors what the Player sees) ──
  const previewPuzzle: Matrix3x3Puzzle = useMemo(
    () => ({
      id: 'editor-preview',
      type: '3x3',
      rule: 'identity', // for editor purposes the rule label is informational only
      shape: cells[0][0].kind,
      optionCount: options.length,
      difficulty: 3,
      cells,
      options,
      correctIndex,
    }),
    [cells, options, correctIndex],
  )

  const handleSave = async () => {
    if (!testName.trim()) {
      setSaveMsg(t('Lütfen bir test adı gir.'))
      return
    }
    setSaveMsg(t('Kaydediliyor…'))
    try {
      const puzzle: Matrix3x3Puzzle = {
        id: `manual-${Date.now()}`,
        type: '3x3',
        rule: 'identity', // 'manual' rule isn't in the union; identity is closest neutral
        shape: cells[0][0].kind,
        optionCount: options.length,
        difficulty: 3,
        cells,
        options,
        correctIndex,
      }
      const id = await saveTest({
        name: testName.trim(),
        description: t('Editör ile elle tasarlanmış soru.'),
        shape: cells[0][0].kind,
        rule: 'identity',
        count: 1,
        seed: 0,
        puzzles: [puzzle],
      })
      setSaveMsg(t('Kaydedildi (id={id}). Kütüphaneden oynayabilirsin.', { id: String(id) }))
      // Optionally jump to library after a short pause
      setTimeout(() => navigate('/library'), 1200)
    } catch (e) {
      setSaveMsg(t('Hata: {msg}', { msg: (e as Error).message }))
    }
  }

  const [r, c] = selected
  const selectedCell = cells[r][c]
  const isAnswerCell = r === 2 && c === 2

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-light text-[var(--color-text)]">{t('Editör')}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t('Hücre hücre soru tasarla. Her hücreye tıkla, sağ panelden ayarla. Sağ alt hücre cevap.')}
            </p>
          </div>
          <Link
            to="/"
            className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition"
          >
            {t('← Ana Sayfa')}
          </Link>
        </div>

        {/* Main grid: left = puzzle grid + actions, right = cell editor */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Left column */}
          <div className="space-y-4">
            {/* Editable 3×3 (click a cell to select it) */}
            <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                {t('Soru Izgarası — tıkla & düzenle')}
              </div>
              <div className="grid grid-cols-3 gap-2 w-fit">
                {cells.flatMap((row, ri) =>
                  row.map((cell, ci) => {
                    const isSelected = ri === r && ci === c
                    const isAnswer = ri === 2 && ci === 2
                    return (
                      <button
                        key={`${ri}-${ci}`}
                        type="button"
                        onClick={() => setSelected([ri, ci])}
                        className={`relative w-[110px] h-[110px] rounded-lg flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-[var(--color-surface-2)] ring-2 ring-[var(--color-accent)]'
                            : 'bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-2)]/80 ring-1 ring-[var(--color-border)]'
                        }`}
                        title={isAnswer ? t('Doğru cevap hücresi') : `[${ri},${ci}]`}
                      >
                        <Shape config={cell} px={92} />
                        {isAnswer && (
                          <span className="absolute bottom-1 right-1 text-[10px] font-bold text-[var(--color-accent)]">
                            {t('✓ cevap')}
                          </span>
                        )}
                        <span className="absolute top-1 left-1 text-[9px] text-[var(--color-text-muted)]">
                          {ri},{ci}
                        </span>
                      </button>
                    )
                  }),
                )}
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={fillAllFromSelected}
                  className="text-xs px-2.5 py-1.5 rounded border border-[var(--color-border)] hover:border-[var(--color-accent)] transition"
                  title={t('Seçili hücreyi 9 yere kopyala (identity başlangıç)')}
                >
                  {t('📋 Seçiliyi tümüne uygula')}
                </button>
                <button
                  type="button"
                  onClick={randomizeAll}
                  className="text-xs px-2.5 py-1.5 rounded border border-[var(--color-border)] hover:border-[var(--color-accent)] transition"
                  title={t('Tüm hücreleri rastgele yap (aynı şekil, farklı parametreler)')}
                >
                  {t('🎲 Tümünü rastgele')}
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-xs px-2.5 py-1.5 rounded border border-[var(--color-border)] hover:border-[var(--color-accent)] transition"
                  title={t('Hepsini varsayılan başlangıca döndür')}
                >
                  {t('↺ Sıfırla')}
                </button>
              </div>
            </div>

            {/* Live preview (as the player would see it) */}
            <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                {t('Oynanma Önizlemesi')}
              </div>
              <div className="flex justify-center">
                <PuzzleGrid puzzle={previewPuzzle} cellPx={82} />
              </div>
            </div>

            {/* Options panel */}
            <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <OptionsPanel
                correct={correct}
                options={options}
                correctIndex={correctIndex}
                siblings={siblings}
                onChange={(opts, idx) => {
                  setOptions(opts)
                  setCorrectIndex(idx)
                }}
              />
            </div>

            {/* Save */}
            <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                {t('Kütüphaneye Kaydet')}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder={t("Test adı (ör. 'Yıldız Döndürme Soru #1')")}
                  className="flex-1 px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded bg-[var(--color-accent)] text-black font-medium text-sm hover:opacity-90 transition"
                >
                  {t('💾 Kaydet')}
                </button>
              </div>
              {saveMsg && (
                <p className="text-xs text-[var(--color-text-muted)] mt-2">{saveMsg}</p>
              )}
              <p className="text-xs text-[var(--color-text-muted)] mt-2 opacity-70">
                {t("Kaydedilince Kütüphane sayfasından oynayabilir ya da Karışık Test'e dahil edebilirsin.")}
              </p>
            </div>
          </div>

          {/* Right column: cell editor */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] sticky top-4">
              <CellEditor
                config={selectedCell}
                onChange={(next) => updateCell(r, c, next)}
                label={
                  isAnswerCell
                    ? t('[{r},{c}] — DOĞRU CEVAP HÜCRESİ', { r, c })
                    : t('[{r},{c}] — Hücre Düzenleme', { r, c })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
