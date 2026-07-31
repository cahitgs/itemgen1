import { useMemo } from 'react'
import { create } from 'zustand'
import { DICT } from './dict'

export type Lang = 'tr' | 'en'

const STORAGE_KEY = 'cogitem-lang'

/** Stored preference wins; otherwise the site opens in English. */
function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'tr' || stored === 'en') return stored
  } catch {
    /* localStorage unavailable (private mode etc.) — fall through */
  }
  return 'en'
}

interface LangState {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useLangStore = create<LangState>((set) => ({
  lang: initialLang(),
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* non-fatal */
    }
    set({ lang })
  },
}))

export type TFunc = (text: string, vars?: Record<string, string | number>) => string

function makeT(lang: Lang): TFunc {
  return (text, vars) => {
    let out = lang === 'en' ? (DICT[text] ?? text) : text
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        out = out.split(`{${k}}`).join(String(v))
      }
    }
    return out
  }
}

/** Translation hook. TR strings are the keys; EN comes from the dictionary. */
export function useT(): TFunc {
  const lang = useLangStore((s) => s.lang)
  return useMemo(() => makeT(lang), [lang])
}

/** Current language + matching Intl locale (for number/date formatting). */
export function useLang(): { lang: Lang; locale: string } {
  const lang = useLangStore((s) => s.lang)
  return { lang, locale: lang === 'tr' ? 'tr-TR' : 'en-US' }
}
