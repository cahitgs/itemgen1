import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  bulkGenerate,
  downloadPuzzlesJson,
  isSupported,
  type BulkResult,
  type BulkSpec,
} from '../logic/bulk'
import { PuzzleGrid } from '../components/puzzle/PuzzleGrid'
import { Shape } from '../components/shapes/Shape'
import type { ShapeKind, RuleKind } from '../types/puzzle'
import { saveTest } from '../db/dexie'

const SHAPE_OPTIONS: Array<{ value: ShapeKind; label: string }> = [
  { value: 'annulus', label: 'Annulus (Halkalar)' },
  { value: 'dice', label: 'Dice (Zar)' },
  { value: 'polygon', label: 'Polygon (Çokgen)' },
  { value: 'star', label: 'Star (Yıldız)' },
  { value: 'arrow', label: 'Arrow (Ok)' },
  { value: 'petals', label: 'Petals (Çiçek)' },
  { value: 'spike-ring', label: 'Spike Ring (Dikenli Halka)' },
  { value: 'hammer', label: 'Hammer (Çekiç + Marker)' },
]

const RULE_OPTIONS: Array<{ value: RuleKind; label: string }> = [
  { value: 'identity', label: 'Identity — hepsi aynı' },
  { value: 'dist-of-3', label: 'Distribution-of-3 — Latin karesi' },
  { value: 'progression', label: 'Progression — iki eksenli artış' },
  { value: 'addition', label: 'Addition — col0 + col1 = col2' },
  { value: 'subtraction', label: 'Subtraction — col0 − col1 = col2' },
]

const COUNT_PRESETS = [10, 100, 1000, 5000]

/**
 * Bulk generation page: configure spec, generate thousands of puzzles,
 * preview them, and download as JSON.
 */
export function Generate() {
  const [shape, setShape] = useState<ShapeKind>('annulus')
  const [rule, setRule] = useState<RuleKind>('dist-of-3')
  const [count, setCount] = useState(100)
  const [seed, setSeed] = useState<string>('')
  const [result, setResult] = useState<BulkResult | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Library save state
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const spec: BulkSpec = useMemo(
    () => ({
      shape,
      rule,
      count,
      seed: seed.trim() === '' ? undefined : Number(seed),
    }),
    [shape, rule, count, seed],
  )

  const supported = isSupported(shape, rule)

  function handleGenerate() {
    setError(null)
    setSaveMsg(null)
    setSaveOpen(false)
    if (!supported) {
      setError(`Bu kombinasyon henüz desteklenmiyor: ${shape} + ${rule}`)
      return
    }
    setRunning(true)
    // Use setTimeout so spinner shows for big counts
    setTimeout(() => {
      try {
        const r = bulkGenerate(spec)
        setResult(r)
        setPreviewIndex(0)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setRunning(false)
      }
    }, 0)
  }

  function openSavePanel() {
    if (!result) return
    // Suggest a sensible default name
    const defaultName = `${shape}-${rule}-${result.puzzles.length}-s${result.seed}`
    setSaveName(defaultName)
    setSaveOpen(true)
    setSaveMsg(null)
  }

  async function handleSave() {
    if (!result) return
    const name = saveName.trim()
    if (!name) {
      setSaveMsg('Bir isim gerekli')
      return
    }
    setSaving(true)
    try {
      await saveTest({
        name,
        shape,
        rule,
        count: result.puzzles.length,
        seed: result.seed,
        puzzles: result.puzzles,
      })
      setSaveMsg(`✓ "${name}" kütüphaneye eklendi`)
      setSaveOpen(false)
    } catch (e) {
      setSaveMsg(`Hata: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          >
            ← Ana Sayfa
          </Link>
          <h1 className="text-2xl font-light">Toplu Soru Üretimi</h1>
          <span />
        </div>

        {/* ── Spec form ── */}
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label="Şekil">
              <select
                className="select"
                value={shape}
                onChange={(e) => setShape(e.target.value as ShapeKind)}
              >
                {SHAPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Mantık">
              <select
                className="select"
                value={rule}
                onChange={(e) => setRule(e.target.value as RuleKind)}
              >
                {RULE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Adet">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50000}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
                  className="input flex-1"
                />
              </div>
              <div className="flex gap-1 mt-2">
                {COUNT_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className="text-xs px-2 py-1 rounded bg-[var(--color-surface-2)] hover:bg-[var(--color-accent)] hover:text-white transition"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>

            <Field
              label="Tohum (seed)"
              hint="Aynı seed = aynı sorular. Boş bırakırsan rastgele."
            >
              <input
                type="text"
                placeholder="örn. 42"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          {!supported && (
            <p className="text-sm text-[var(--color-danger)] mt-4">
              ⚠ Bu kombinasyon henüz desteklenmiyor. Faz 3'te eklenecek.
            </p>
          )}
          {error && <p className="text-sm text-[var(--color-danger)] mt-4">{error}</p>}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!supported || running}
              className="px-6 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {running ? 'Üretiliyor…' : `${count.toLocaleString('tr-TR')} soru üret`}
            </button>
            {result && (
              <>
                <button
                  type="button"
                  onClick={() => downloadPuzzlesJson(result, spec)}
                  className="px-6 py-2.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition cursor-pointer"
                >
                  JSON İndir
                </button>
                <button
                  type="button"
                  onClick={openSavePanel}
                  className="px-6 py-2.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition cursor-pointer"
                >
                  Kütüphaneye Kaydet
                </button>
              </>
            )}
          </div>

          {/* Inline save panel */}
          {saveOpen && result && (
            <div className="mt-4 p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
              <label className="text-sm text-[var(--color-text-muted)] block mb-2">
                Test ismi
              </label>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave()
                    if (e.key === 'Escape') setSaveOpen(false)
                  }}
                  placeholder="örn. annulus-progresion-100"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium disabled:opacity-50 transition cursor-pointer"
                >
                  {saving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => setSaveOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-text-muted)] transition cursor-pointer"
                >
                  İptal
                </button>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-2 opacity-70">
                Test tarayıcının IndexedDB veritabanında saklanır.
                <Link to="/library" className="text-[var(--color-accent)] hover:underline ml-1">
                  Kütüphanede görüntüle →
                </Link>
              </p>
            </div>
          )}

          {saveMsg && !saveOpen && (
            <div className="mt-4 text-sm">
              <span className={saveMsg.startsWith('Hata') ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}>
                {saveMsg}
              </span>
              {!saveMsg.startsWith('Hata') && (
                <Link to="/library" className="text-[var(--color-accent)] hover:underline ml-2">
                  Kütüphaneye git →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ── Result summary + preview ── */}
        {result && <ResultPanel result={result} previewIndex={previewIndex} setPreviewIndex={setPreviewIndex} />}
      </div>

      <style>{`
        .select, .input {
          width: 100%;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          color: var(--color-text);
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 14px;
        }
        .select:focus, .input:focus {
          outline: none;
          border-color: var(--color-accent);
        }
      `}</style>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      {children}
      {hint && <span className="text-xs text-[var(--color-text-muted)] opacity-70">{hint}</span>}
    </label>
  )
}

function ResultPanel({
  result,
  previewIndex,
  setPreviewIndex,
}: {
  result: BulkResult
  previewIndex: number
  setPreviewIndex: (i: number) => void
}) {
  const puzzle = result.puzzles[previewIndex]
  if (!puzzle) return null

  return (
    <>
      <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Stat label="Üretildi" value={result.puzzles.length.toLocaleString('tr-TR')} accent />
          <Stat label="Yinelenmiş atlandı" value={result.duplicatesSkipped.toLocaleString('tr-TR')} />
          <Stat label="Geçersiz atlandı" value={result.invalidSkipped.toLocaleString('tr-TR')} />
          <Stat label="Toplam deneme" value={result.attempts.toLocaleString('tr-TR')} />
          <Stat label="Seed" value={String(result.seed)} mono />
        </div>
        {result.reachedCeiling && (
          <p className="text-xs text-[var(--color-text-muted)] mt-4 opacity-80">
            ℹ Parametre uzayı tükendi — daha fazla soru üretmek için ek varyasyon eksenleri gerekir
            (renk paleti, ek şekiller, daha geniş döndürme aralığı).
          </p>
        )}
      </div>

      <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Önizleme</h2>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
              disabled={previewIndex === 0}
              className="px-3 py-1 rounded bg-[var(--color-surface-2)] disabled:opacity-30 hover:bg-[var(--color-accent)] hover:text-white transition cursor-pointer"
            >
              ←
            </button>
            <span className="text-[var(--color-text-muted)]">
              {previewIndex + 1} / {result.puzzles.length}
            </span>
            <button
              type="button"
              onClick={() =>
                setPreviewIndex(Math.min(result.puzzles.length - 1, previewIndex + 1))
              }
              disabled={previewIndex === result.puzzles.length - 1}
              className="px-3 py-1 rounded bg-[var(--color-surface-2)] disabled:opacity-30 hover:bg-[var(--color-accent)] hover:text-white transition cursor-pointer"
            >
              →
            </button>
            <button
              type="button"
              onClick={() =>
                setPreviewIndex(Math.floor(Math.random() * result.puzzles.length))
              }
              className="px-3 py-1 rounded bg-[var(--color-surface-2)] hover:bg-[var(--color-accent)] hover:text-white transition cursor-pointer"
            >
              Rastgele
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start justify-center">
          <PuzzleGrid puzzle={puzzle} cellPx={90} />
          <div>
            <p className="text-sm text-[var(--color-text-muted)] mb-2">
              Cevap şıkları (doğru:{' '}
              <span className="text-[var(--color-success)]">
                #{puzzle.correctIndex + 1}
              </span>
              )
            </p>
            <div className="flex flex-wrap gap-2">
              {puzzle.options.map((opt, i) => (
                <div
                  key={i}
                  className={`w-20 h-20 rounded-lg flex items-center justify-center ${
                    i === puzzle.correctIndex
                      ? 'bg-[var(--color-surface-2)] ring-2 ring-[var(--color-success)]'
                      : 'bg-[var(--color-surface-2)]'
                  }`}
                >
                  <Shape config={opt} px={70} />
                </div>
              ))}
            </div>
            <pre className="mt-4 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-2)] p-3 rounded max-w-md overflow-auto">
{`id:    ${puzzle.id}
shape: ${puzzle.shape}
rule:  ${puzzle.rule}
diff:  ${puzzle.difficulty}`}
            </pre>
          </div>
        </div>
      </div>
    </>
  )
}

function Stat({
  label,
  value,
  accent,
  mono,
}: {
  label: string
  value: string
  accent?: boolean
  mono?: boolean
}) {
  return (
    <div>
      <div className="text-xs text-[var(--color-text-muted)] mb-1">{label}</div>
      <div
        className={`text-xl ${accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'} ${mono ? 'font-mono text-base' : 'font-medium'}`}
      >
        {value}
      </div>
    </div>
  )
}
