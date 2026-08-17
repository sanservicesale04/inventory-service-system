import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import './Login.css'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { login } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError(t('loginError'))
      return
    }
    setSubmitting(true)
    const { error: loginError } = await login(username.trim(), password)
    setSubmitting(false)

    if (loginError) {
      setError(t('loginError'))
      return
    }
    navigate('/dashboard')
  }

  return (
    <div className="login-page">
      <div className="login-lang-toggle">
        <button className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')} type="button">
          TH
        </button>
        <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')} type="button">
          EN
        </button>
      </div>

      <div className="login-brand-panel">
        <img src="/logo-san.png" alt="SAN logo" className="login-brand-logo" />
        <div className="login-brand-accent" />
        <h1 className="login-brand-title">
          {lang === 'th' ? 'SAN SERVICE AND SUPPLY' : 'SAN SERVICE AND SUPPLY'}
        </h1>
        <p className="login-brand-subtitle">
          {lang === 'th'
            ? 'ระบบจัดการสินค้า บันทึกนำเข้า-จ่ายออก และติดตามงานบริการ Fire Alarm, Fire Pump, Lightning Protection แบบเรียลไทม์'
            : 'Manage inventory, track stock movements, and follow up on Fire Alarm, Fire Pump, and Lightning Protection service jobs in real time.'}
        </p>
      </div>

      <div className="login-form-panel">
        <div className="login-form-header">
          <h2 className="login-form-title">{t('loginTitle')}</h2>
          <p className="login-form-subtitle">{t('loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="login-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="login-field">
            <label htmlFor="username">{t('username')}</label>
            <div className="login-input-wrap">
              <User size={17} />
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={lang === 'th' ? 'กรอกชื่อผู้ใช้หรืออีเมล' : 'Enter username or email'}
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">{t('password')}</label>
            <div className="login-input-wrap">
              <Lock size={17} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={lang === 'th' ? 'กรอกรหัสผ่าน' : 'Enter password'}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={17} className="spin" />
                {t('loggingIn')}
              </>
            ) : (
              t('loginButton')
            )}
          </button>
        </form>
      </div>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
