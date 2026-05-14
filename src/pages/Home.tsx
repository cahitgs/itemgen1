import { Link } from 'react-router-dom'

export function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-3xl w-full">
        <h1 className="text-5xl font-light mb-4 text-[var(--color-text)]">
          Cogitem
        </h1>
        <p className="text-lg text-[var(--color-text-muted)] mb-12">
          <em>Cogito ergo item</em> — non-verbal bilişsel test platformu.
          Görsel-mantıksal bulmacaları üret, karıştır, oynat.
          Binlerce benzersiz soru, tek tıkla.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/play"
            className="block p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition"
          >
            <div className="text-3xl mb-2">▶</div>
            <h2 className="text-xl font-medium mb-1 text-[var(--color-text)]">Teste Başla</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Hazır örnek sorularla testi dene. Sonuçları CSV olarak indir.
            </p>
          </Link>

          <Link
            to="/generate"
            className="block p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition"
          >
            <div className="text-3xl mb-2">⚡</div>
            <h2 className="text-xl font-medium mb-1 text-[var(--color-text)]">Toplu Üret</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Şekil + kural + adet seç → binlerce benzersiz soruyu tek seferde üret.
            </p>
          </Link>

          <Link
            to="/mixer"
            className="block p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition"
          >
            <div className="text-3xl mb-2">🎲</div>
            <h2 className="text-xl font-medium mb-1 text-[var(--color-text)]">Karışık Test</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Birden çok testten N'er soru çek, karışık bir test yap.
            </p>
          </Link>

          <Link
            to="/library"
            className="block p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition"
          >
            <div className="text-3xl mb-2">📚</div>
            <h2 className="text-xl font-medium mb-1 text-[var(--color-text)]">Kütüphane</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Kaydettiğin testler. Tekrar oyna, JSON indir, sil.
            </p>
          </Link>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] mt-12 opacity-60">
          7 şekil · 5 mantık (Identity, Dist-of-3, Progression, Addition, Subtraction) ·
          tohumlu toplu üretim · kütüphane · CSV sonuç dışa aktarımı
        </p>
      </div>
    </div>
  )
}
