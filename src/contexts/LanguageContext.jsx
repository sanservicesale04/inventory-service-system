import { createContext, useContext, useState, useEffect } from 'react'
import { th } from '../locales/th'
import { en } from '../locales/en'

const translations = { th, en }

const LanguageContext = createContext(undefined)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('app_lang') || 'th'
  })

  useEffect(() => {
    localStorage.setItem('app_lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  const t = (key) => translations[lang][key] || translations.th[key] || key

  const toggleLang = () => setLang((prev) => (prev === 'th' ? 'en' : 'th'))

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
