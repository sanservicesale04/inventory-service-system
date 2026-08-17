import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { getVisibleNav } from './navConfig'
import './Sidebar.css'

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { role, logout } = useAuth()
  const { t } = useLanguage()
  const location = useLocation()
  const [openMenus, setOpenMenus] = useState(() => {
    // เปิด submenu อัตโนมัติถ้า path ปัจจุบันอยู่ในนั้น
    const initial = {}
    getVisibleNav(role).forEach((item) => {
      if (item.children?.some((c) => location.pathname.startsWith(c.path))) {
        initial[item.key] = true
      }
    })
    return initial
  })

  const visibleNav = getVisibleNav(role)

  function toggleMenu(key) {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function isParentActive(item) {
    if (item.path) return location.pathname === item.path
    return item.children?.some((c) => location.pathname.startsWith(c.path))
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <img src="/logo-san.png" alt="SAN Logo" />
        <span className="sidebar-header-text">SAN SERVICE AND SUPPLY</span>
      </div>

      <button className="sidebar-toggle" onClick={onToggleCollapse} aria-label="Toggle sidebar" type="button">
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      <nav className="sidebar-nav">
        {visibleNav.map((item) => {
          const Icon = item.icon
          if (!item.children) {
            return (
              <div className="nav-item" key={item.key}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
                  onClick={onCloseMobile}
                >
                  <Icon size={19} />
                  <span className="nav-item-text">{t(item.labelKey)}</span>
                </NavLink>
                <span className="nav-item-tooltip">{t(item.labelKey)}</span>
              </div>
            )
          }

          const isOpen = !!openMenus[item.key]
          const active = isParentActive(item)

          return (
            <div className="nav-item" key={item.key}>
              <button
                className={`nav-item-link ${active ? 'active' : ''}`}
                onClick={() => toggleMenu(item.key)}
                type="button"
              >
                <Icon size={19} />
                <span className="nav-item-text">{t(item.labelKey)}</span>
                <ChevronRight size={15} className={`nav-item-chevron ${isOpen ? 'open' : ''}`} />
              </button>
              <span className="nav-item-tooltip">{t(item.labelKey)}</span>
              <div className={`nav-submenu ${isOpen ? 'open' : ''}`}>
                {item.children.map((child) => (
                  <NavLink
                    key={child.key}
                    to={child.path}
                    className={({ isActive }) => `nav-submenu-link ${isActive ? 'active' : ''}`}
                    onClick={onCloseMobile}
                  >
                    {t(child.labelKey)}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="nav-item">
          <button className="nav-item-link" onClick={logout} type="button">
            <LogOut size={19} />
            <span className="nav-item-text">{t('menuLogout')}</span>
          </button>
          <span className="nav-item-tooltip">{t('menuLogout')}</span>
        </div>
      </div>
    </aside>
  )
}
