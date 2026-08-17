import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { exportToExcel } from '../lib/excelUtils'
import { successToast, errorToast } from '../lib/alerts'
import '../styles/crud-pages.css'

export default function ActivityLogs() {
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [filterModule, setFilterModule] = useState('all')
  const [filterAction, setFilterAction] = useState('all')

  useEffect(() => {
    loadActivities()
    const channel = supabase
      .channel('activity-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, loadActivities)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadActivities() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setActivities(data || [])
    } catch (err) {
      errorToast(err.message)
    }
    setLoading(false)
  }

  function handleSort(field) {
    if (sortBy === field) setSortAsc(!sortAsc)
    else { setSortBy(field); setSortAsc(true) }
  }

  const modules = ['all', ...new Set(activities.map((a) => a.module))].sort()
  const actions = ['all', ...new Set(activities.map((a) => a.action_type))].sort()

  const filteredActivities = activities.filter((a) => {
    const moduleMatch = filterModule === 'all' || a.module === filterModule
    const actionMatch = filterAction === 'all' || a.action_type === filterAction
    return moduleMatch && actionMatch
  })

  const sortedActivities = [...filteredActivities].sort((a, b) => {
    const aVal = a[sortBy] || '', bVal = b[sortBy] || ''
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortAsc ? cmp : -cmp
  })

  async function handleExport() {
    const toExport = sortedActivities.map((a) => ({
      'วันที่เวลา': a.created_at ? new Date(a.created_at).toLocaleString('th-TH') : '-',
      'ผู้ใช้': a.username,
      'การกระทำ': a.action_type,
      'โมดูล': a.module,
      'รายละเอียด': a.description || '-',
    }))

    if (toExport.length === 0) {
      errorToast('ไม่มีข้อมูล')
      return
    }

    exportToExcel(toExport, 'activity_logs', `activity_logs_${new Date().toISOString().split('T')[0]}`)
    await successToast('ส่งออกสำเร็จ')
  }

  const actionColors = {
    create: '#10b981',
    update: '#3b82f6',
    delete: '#ef4444',
    view: '#8b5cf6',
  }

  return (
    <div>
      <div className="crud-page-header">
        <div>
          <h1>{lang === 'th' ? 'ประวัติการใช้งาน' : 'Activity Logs'}</h1>
          <p>{loading ? 'โหลด...' : `${sortedActivities.length} รายการ`}</p>
        </div>
        <div className="crud-page-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600 }}>
            {lang === 'th' ? 'โมดูล' : 'Module'}
          </label>
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: '0.9rem',
            }}
          >
            {modules.map((m) => (
              <option key={m} value={m}>
                {m === 'all' ? 'ทั้งหมด' : m}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600 }}>
            {lang === 'th' ? 'การกระทำ' : 'Action'}
          </label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: '0.9rem',
            }}
          >
            {actions.map((a) => (
              <option key={a} value={a}>
                {a === 'all' ? 'ทั้งหมด' : a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="crud-table-wrapper">
        <table className="crud-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                {lang === 'th' ? 'วันที่เวลา' : 'Date Time'} {sortBy === 'created_at' && (sortAsc ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('username')} style={{ cursor: 'pointer' }}>
                {lang === 'th' ? 'ผู้ใช้' : 'User'} {sortBy === 'username' && (sortAsc ? '▲' : '▼')}
              </th>
              <th>{lang === 'th' ? 'การกระทำ' : 'Action'}</th>
              <th>{lang === 'th' ? 'โมดูล' : 'Module'}</th>
              <th>{lang === 'th' ? 'รายละเอียด' : 'Description'}</th>
            </tr>
          </thead>
          <tbody>
            {sortedActivities.map((a) => (
              <tr key={a.id}>
                <td style={{ fontSize: '0.85rem' }}>{a.created_at ? new Date(a.created_at).toLocaleString('th-TH') : '-'}</td>
                <td className="code">{a.username}</td>
                <td>
                  <span
                    style={{
                      background: actionColors[a.action_type] || '#6b7280',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {a.action_type}
                  </span>
                </td>
                <td>{a.module}</td>
                <td style={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.description || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedActivities.length === 0 && !loading && <div className="empty-state">{t('noData')}</div>}
      </div>
    </div>
  )
}
