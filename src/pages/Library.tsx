import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteTest, getTest, listTestsMeta, type SavedTestMeta } from '../db/dexie'

/**
 * Library page: list of saved tests with actions (play / delete / export JSON).
 * Data lives in IndexedDB via Dexie — survives reloads and tab closures.
 */
export function Library() {
  const [tests, setTests] = useState<SavedTestMeta[] | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const navigate = useNavigate()

  async function refresh() {
    setTests(await listTestsMeta())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleDelete(id: number, name: string) {
    if (!confirm(`"${name}" silinsin mi?`)) return
    setBusyId(id)
    try {
      await deleteTest(id)
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function handlePlay(id: number) {
    setBusyId(id)
    try {
      const test = await getTest(id)
      if (!test) {
        alert('Test bulunamadı (silinmiş olabilir).')
        return
      }
      navigate('/play', {
        state: {
          puzzles: test.puzzles,
          testName: test.name,
        },
      })
    } finally {
      setBusyId(null)
    }
  }

  async function handleExport(id: number) {
    setBusyId(id)
    try {
      const test = await getTest(id)
      if (!test) return
      const payload = {
        meta: {
          generator: 'neocorvus',
          exportedAt: new Date().toISOString(),
          name: test.name,
          shape: test.shape,
          rule: test.rule,
          count: test.count,
          seed: test.seed,
        },
        puzzles: test.puzzles,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${test.name.replace(/[^a-z0-9-]/gi, '_')}.json`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setBusyId(null)
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
          <h1 className="text-2xl font-light">Kütüphane</h1>
          <Link
            to="/generate"
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            + Yeni test üret
          </Link>
        </div>

        {tests === null && (
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-12 text-center text-[var(--color-text-muted)]">
            Yükleniyor…
          </div>
        )}

        {tests !== null && tests.length === 0 && (
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-12 text-center">
            <p className="text-[var(--color-text-muted)] mb-4">
              Henüz kaydedilmiş test yok.
            </p>
            <Link
              to="/generate"
              className="inline-block px-6 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition"
            >
              İlk testini üret
            </Link>
          </div>
        )}

        {tests !== null && tests.length > 0 && (
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-[var(--color-text-muted)] text-left bg-[var(--color-surface-2)]">
                <tr>
                  <th className="px-4 py-3">İsim</th>
                  <th className="px-4 py-3">Şekil</th>
                  <th className="px-4 py-3">Kural</th>
                  <th className="px-4 py-3 text-right">Adet</th>
                  <th className="px-4 py-3">Seed</th>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => {
                  const busy = busyId === t.id
                  const isMixed = t.shape === 'mixed' || t.rule === 'mixed'
                  return (
                    <tr
                      key={t.id}
                      className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                        {isMixed && <span className="mr-1.5" title="Mixer ile yapıldı">🎲</span>}
                        {t.name}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {isMixed ? (
                          <span className="text-[var(--color-accent)]">mixed</span>
                        ) : (
                          t.shape
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {isMixed ? (
                          <span className="text-[var(--color-accent)]">mixed</span>
                        ) : (
                          t.rule
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-text-muted)]">
                        {t.count.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-muted)]">
                        {t.seed}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                        {new Date(t.createdAt).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            disabled={busy || !t.id}
                            onClick={() => t.id && handlePlay(t.id)}
                            className="px-3 py-1 rounded bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs disabled:opacity-50 transition cursor-pointer"
                          >
                            Oyna
                          </button>
                          <button
                            type="button"
                            disabled={busy || !t.id}
                            onClick={() => t.id && handleExport(t.id)}
                            className="px-3 py-1 rounded border border-[var(--color-border)] hover:border-[var(--color-accent)] text-xs disabled:opacity-50 transition cursor-pointer"
                          >
                            JSON
                          </button>
                          <button
                            type="button"
                            disabled={busy || !t.id}
                            onClick={() => t.id && handleDelete(t.id, t.name)}
                            className="px-3 py-1 rounded border border-[var(--color-border)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] text-xs disabled:opacity-50 transition cursor-pointer"
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-[var(--color-text-muted)] mt-6 opacity-60">
          Kütüphane bu tarayıcıda IndexedDB'de saklanır. Farklı tarayıcı/cihazda görünmez.
          Paylaşmak için JSON olarak dışa aktarın.
        </p>
      </div>
    </div>
  )
}
