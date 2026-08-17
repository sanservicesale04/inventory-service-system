import { Menu } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import './Topbar.css'

const roleLabelKey = {
  admin: 'roleAdmin',
  user: 'roleUser',
  technician: 'roleTechnician',
}

export default function Topbar({ title, onOpenMobileMenu }) {
  const { profile, role } = useAuth()
  const { lang, setLang, t } = useLanguage()

  const initials = (profile?.full_name || profile?.username || '?')
    .trim()
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-mobile-toggle" onClick={onOpenMobileMenu} aria-label="Open menu" type="button">
          <Menu size={22} />
        </button>
        <span className="topbar-breadcrumb">{title}</span>
      </div>

      <div className="topbar-right">
        <div className="topbar-lang-toggle">
          <button className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')} type="button">
            TH
          </button>
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')} type="button">
            EN
          </button>
        </div>

        <div className="topbar-user">
          <div className="topbar-user-avatar">{initials}</div>
          <div className="topbar-user-info">
            <span className="topbar-user-name">{profile?.full_name || profile?.username}</span>
            <span className="topbar-user-role">{t(roleLabelKey[role] || 'roleUser')}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
