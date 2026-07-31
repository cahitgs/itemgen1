import { useLangStore, type Lang } from '../i18n'

/** Fixed TR/EN switcher, bottom-right on every page. */
export function LangToggle() {
  const lang = useLangStore((s) => s.lang)
  const setLang = useLangStore((s) => s.setLang)

  const btn = (value: Lang, label: string) => (
    <button
      type="button"
      onClick={() => setLang(value)}
      className={`px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
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
    <div className="fixed bottom-4 right-4 z-50 flex overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
      {btn('tr', 'TR')}
      {btn('en', 'EN')}
    </div>
  )
}
