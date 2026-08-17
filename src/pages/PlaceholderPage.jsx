import { Construction } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

export default function PlaceholderPage({ titleKey }) {
  const { t, lang } = useLanguage()
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        color: 'var(--color-text-muted)',
        textAlign: 'center',
      }}
    >
      <Construction size={36} style={{ marginBottom: 16, opacity: 0.5 }} />
      <h2 style={{ color: 'var(--color-text)', marginBottom: 8 }}>{t(titleKey)}</h2>
      <p style={{ fontSize: '0.9rem', maxWidth: 360 }}>
        {lang === 'th'
          ? 'หน้านี้จะถูกสร้างในขั้นตอนถัดไป'
          : 'This page will be built in the next development step.'}
      </p>
    </div>
  )
}
