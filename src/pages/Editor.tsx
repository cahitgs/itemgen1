import { Link } from 'react-router-dom'

/**
 * Editor placeholder — will become the WYSIWYG question designer in Faz 2.
 * For now, just hints at what's coming.
 */
export function Editor() {
  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-light mb-3 text-[var(--color-text)]">Editör</h1>
        <p className="text-[var(--color-text-muted)] mb-6">
          Canlı önizlemeli soru tasarım arayüzü Faz 2'de gelecek.
          Şu an MVP olarak sadece çalıştırıcı (Player) hazır — örnek soruları{' '}
          <Link to="/play" className="text-[var(--color-accent)] underline">
            burada
          </Link>{' '}
          deneyebilirsin.
        </p>
        <Link
          to="/"
          className="inline-block px-4 py-2 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition"
        >
          ← Ana Sayfa
        </Link>
      </div>
    </div>
  )
}
