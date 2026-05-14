import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getTest,
  listTestsMeta,
  saveTest,
  type MixerSource,
  type SavedTestMeta,
} from '../db/dexie'
import { mulberry32, randomSeed, sample, shuffle } from '../logic/rng'
import type { PuzzleItem } from '../types/puzzle'
import { PuzzleGrid } from '../components/puzzle/PuzzleGrid'
import { PatternCompletionGrid } from '../components/puzzle/PatternCompletionGrid'

/**
 * Mixer page: build a new test by sampling N puzzles from one or more
 * existing library tests. Result is a new mixed-rule, mixed-shape test
 * that can be saved back into the library or played immediately.
 */
export function Mixer() {
  const navigate = useNavigate()
  const [tests, setTests] = useState<SavedTestMeta[] | null>(null)
  /** testId → number to draw (0 means "skip"). */
  const [draws, setDraws] = useState<Record<number, number>>({})
  const [seedInput, setSeedInput] = useState<string>('')
  const [mixed, setMixed] = useState<{
    puzzles: PuzzleItem[]
    sources: MixerSource[]
    seed: number
  } | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [working, setWorking] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    listTestsMeta().then(setTests)
  }, [])

  // Convenience: total drawn count + list of selected sources
  const totals = useMemo(() => {
    if (!tests) return { sources: 0, puzzles: 0 }
    let sources = 0
    let puzzles = 0
    for (const t of tests) {
      const d = draws[t.id ?? -1] ?? 0
      if (d > 0) {
        sources++
        puzzles += Math.min(d, t.count)
      }
    }
    return { sources, puzzles }
  }, [tests, draws])

  function setDraw(testId: number, n: number, max: number) {
    const clamped = Math.max(0, Math.min(max, Math.floor(n) || 0))
    setDraws((d) => ({ ...d, [testId]: clamped }))
  }

  async function handleMix() {
    if (totals.puzzles === 0 || !tests) return
    setWorking(true)
    setSaveMsg(null)
    try {
      const seed = seedInput.trim() === '' ? randomSeed() : Number(seedInput)
      const rng = mulberry32(seed)
      const collected: PuzzleItem[] = []
      const sources: MixerSource[] = []

      for (const t of tests) {
        const want = draws[t.id ?? -1] ?? 0
        if (want <= 0 || !t.id) continue
        // Load full row to access puzzles
        const full = await getTest(t.id)
        if (!full) continue
        const n = Math.min(want, full.puzzles.length)
        const picked = sample(rng, full.puzzles, n)
        collected.push(...picked)
        sources.push({ testId: t.id, testName: t.name, drawn: n })
      }

      // Final mix: shuffle the assembled pool so source rules interleave
      const final = shuffle(rng, collected).result
      setMixed({ puzzles: final, sources, seed })
      setPreviewIndex(0)
      setSaveName(`mixed-${final.length}-s${seed}`)
    } finally {
      setWorking(false)
    }
  }

  async function handleSave(thenPlay: boolean) {
    if (!mixed) return
    const name = saveName.trim()
    if (!name) {
      setSaveMsg('İsim gerekli')
      return
    }
    setSaving(true)
    setSaveMsg(null)
    try {
      const id = await saveTest({
        name,
        shape: 'mixed',
        rule: 'mixed',
        count: mixed.puzzles.length,
        seed: mixed.seed,
        puzzles: mixed.puzzles,
        sources: mixed.sources,
      })
      setSaveMsg(`✓ "${name}" kaydedildi`)
      if (thenPlay) {
        navigate('/play', { state: { puzzles: mixed.puzzles, testName: name } })
      } else {
        // Refresh metadata so the new test appears if user comes back
        listTestsMeta().then(setTests)
      }
      void id
    } catch (e) {
      setSaveMsg(`Hata: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  function handlePlayWithoutSave() {
    if (!mixed) return
    navigate('/play', {
      state: { puzzles: mixed.puzzles, testName: `Mixer (${mixed.puzzles.length} soru)` },
    })
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
          <h1 className="text-2xl font-light">Karışık Test Oluştur</h1>
          <Link to="/library" className="text-sm text-[var(--color-accent)] hover:underline">
            Kütüphane →
          </Link>
        </div>

        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Kütüphandeki testlerden istediğin kadar soru çekip yeni bir karışık test
          oluştur. Farklı şekil ve mantıklardan örnekleyerek kademeli bir
          zorluk eğrisi yapabilirsin.
        </p>

        {/* ── Sources list ── */}
        {tests === null && (
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-12 text-center text-[var(--color-text-muted)]">
            Yükleniyor…
          </div>
        )}

        {tests !== null && tests.length === 0 && (
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-12 text-center">
            <p className="text-[var(--color-text-muted)] mb-4">
              Henüz kaydedilmiş test yok. Önce kütüphaneye birkaç test eklemelisin.
            </p>
            <Link
              to="/generate"
              className="inline-block px-6 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition"
            >
              Test üretmeye git
            </Link>
          </div>
        )}

        {tests !== null && tests.length > 0 && (
          <>
            <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="text-[var(--color-text-muted)] text-left bg-[var(--color-surface-2)]">
                  <tr>
                    <th className="px-4 py-3">Test</th>
                    <th className="px-4 py-3">Şekil</th>
                    <th className="px-4 py-3">Kural</th>
                    <th className="px-4 py-3 text-right">Havuz</th>
                    <th className="px-4 py-3 text-right">Kaç çek?</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t) => {
                    if (!t.id) return null
                    const val = draws[t.id] ?? 0
                    return (
                      <tr
                        key={t.id}
                        className={`border-t border-[var(--color-border)] transition ${
                          val > 0 ? 'bg-[var(--color-surface-2)]/50' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-[var(--color-text)]">{t.name}</td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)]">{t.shape}</td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)]">{t.rule}</td>
                        <td className="px-4 py-3 text-right text-[var(--color-text-muted)]">
                          {t.count.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() => setDraw(t.id!, 0, t.count)}
                              className="px-2 py-1 rounded bg-[var(--color-surface-2)] text-xs hover:bg-[var(--color-border)] transition cursor-pointer"
                            >
                              0
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={t.count}
                              value={val}
                              onChange={(e) => setDraw(t.id!, Number(e.target.value), t.count)}
                              className="w-20 text-right px-2 py-1 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setDraw(t.id!, Math.min(5, t.count), t.count)}
                              className="px-2 py-1 rounded bg-[var(--color-surface-2)] text-xs hover:bg-[var(--color-border)] transition cursor-pointer"
                            >
                              5
                            </button>
                            <button
                              type="button"
                              onClick={() => setDraw(t.id!, Math.min(10, t.count), t.count)}
                              className="px-2 py-1 rounded bg-[var(--color-surface-2)] text-xs hover:bg-[var(--color-border)] transition cursor-pointer"
                            >
                              10
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Seed + mix button ── */}
            <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <label className="text-sm text-[var(--color-text-muted)] block mb-1.5">
                    Tohum (opsiyonel) — aynı tohum = aynı karışım
                  </label>
                  <input
                    type="text"
                    placeholder="örn. 42"
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                  />
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">
                  Seçilen: <span className="text-[var(--color-accent)] font-medium">{totals.sources}</span> kaynak,{' '}
                  <span className="text-[var(--color-accent)] font-medium">{totals.puzzles}</span> soru
                </div>
                <button
                  type="button"
                  onClick={handleMix}
                  disabled={totals.puzzles === 0 || working}
                  className="px-6 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  {working ? 'Karıştırılıyor…' : 'Karıştır'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Mixed result ── */}
        {mixed && (
          <>
            <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 mb-6">
              <h2 className="text-lg font-medium mb-3">Karışım Hazır</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <Stat label="Toplam soru" value={mixed.puzzles.length.toString()} accent />
                <Stat label="Kaynak sayısı" value={mixed.sources.length.toString()} />
                <Stat label="Tohum" value={String(mixed.seed)} mono />
                <Stat label="" value="" />
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                Kaynaklar:{' '}
                {mixed.sources.map((s, i) => (
                  <span key={s.testId}>
                    <span className="text-[var(--color-text)]">{s.testName}</span>
                    <span> ({s.drawn})</span>
                    {i < mixed.sources.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </div>
            </div>

            {/* Save panel */}
            <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 mb-6">
              <label className="text-sm text-[var(--color-text-muted)] block mb-2">
                Test ismi
              </label>
              <div className="flex flex-col md:flex-row gap-2 mb-3">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="mixed-10-s42"
                />
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] disabled:opacity-50 transition cursor-pointer"
                >
                  {saving ? '…' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium disabled:opacity-50 transition cursor-pointer"
                >
                  Kaydet & Oyna
                </button>
                <button
                  type="button"
                  onClick={handlePlayWithoutSave}
                  className="px-4 py-2 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition cursor-pointer"
                >
                  Sadece Oyna
                </button>
              </div>
              {saveMsg && (
                <div className="text-sm">
                  <span
                    className={
                      saveMsg.startsWith('Hata')
                        ? 'text-[var(--color-danger)]'
                        : 'text-[var(--color-success)]'
                    }
                  >
                    {saveMsg}
                  </span>
                </div>
              )}
            </div>

            {/* Preview */}
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
                    {previewIndex + 1} / {mixed.puzzles.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewIndex(Math.min(mixed.puzzles.length - 1, previewIndex + 1))
                    }
                    disabled={previewIndex === mixed.puzzles.length - 1}
                    className="px-3 py-1 rounded bg-[var(--color-surface-2)] disabled:opacity-30 hover:bg-[var(--color-accent)] hover:text-white transition cursor-pointer"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-start justify-center">
                {mixed.puzzles[previewIndex].type === 'pattern-completion' ? (
                  <PatternCompletionGrid puzzle={mixed.puzzles[previewIndex]} cellPx={32} />
                ) : mixed.puzzles[previewIndex].type === '3x3' ? (
                  <PuzzleGrid puzzle={mixed.puzzles[previewIndex]} cellPx={80} />
                ) : null}
                <pre className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-2)] p-3 rounded">
{`shape: ${mixed.puzzles[previewIndex].shape}
rule:  ${mixed.puzzles[previewIndex].rule}
diff:  ${mixed.puzzles[previewIndex].difficulty}`}
                </pre>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
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
  if (!label) return <div />
  return (
    <div>
      <div className="text-xs text-[var(--color-text-muted)] mb-1">{label}</div>
      <div
        className={`text-xl ${accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'} ${
          mono ? 'font-mono text-base' : 'font-medium'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
