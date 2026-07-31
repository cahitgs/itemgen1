import { useLangStore, type Lang } from '../i18n'

/** Fixed TR/EN switcher, top-right on every page. */
export function LangToggle() {
  const lang = useLangStore((s) => s.lang)
  const setLang = useLangStore((s) => s.setLang)

  const btn = (value: Lang, label: string) => (
    <button
      type="button"
      onClick={() => setLang(value)}
      className={`px-3.5 py-1.5 text-sm font-semibold transition cursor-pointer ${
        lang === value
          ? 'bg-[var(--color-accent)] text-white'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
      }`}
      aria-pressed={lang === value}
    >
      {label}
    </button>
  )

  return (
    <div className="fixed top-3 right-3 z-50 flex overflow-hidden rounded-full border-2 border-[var(--color-accent)] bg-[var(--color-surface)] shadow-lg">
      {btn('tr', 'TR')}
      {btn('en', 'EN')}
    </div>
  )
}
