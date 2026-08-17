import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, AlertTriangle, Wrench, ArrowLeftRight, History, CalendarClock } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import './Dashboard.css'

export default function Dashboard() {
  const { profile, role } = useAuth()
  const { t, lang } = useLanguage()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    pendingJobs: 0,
    todayTx: 0,
  })
  const [recentLogs, setRecentLogs] = useState([])
  const [upcomingJobs, setUpcomingJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()

    // Realtime: subscribe to changes so dashboard numbers update live across users
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_jobs' }, loadDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_transactions' }, loadDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, loadDashboardData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  async function loadDashboardData() {
    const today = new Date().toISOString().split('T')[0]

    const tasks = []

    if (role !== 'technician') {
      tasks.push(
        supabase.from('products').select('id, stock_quantity, min_stock_alert', { count: 'exact' })
      )
      tasks.push(
        supabase
          .from('stock_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('transaction_date', today)
      )
    } else {
      tasks.push(Promise.resolve({ data: [], count: 0 }))
      tasks.push(Promise.resolve({ count: 0 }))
    }

    tasks.push(
      supabase
        .from('service_jobs')
        .select('id', { count: 'exact', head: true })
        .in('status', ['scheduled', 'in_progress'])
    )

    tasks.push(
      role === 'admin'
        ? supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(8)
        : Promise.resolve({ data: [] })
    )

    tasks.push(
      supabase
        .from('service_jobs')
        .select('*')
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .limit(6)
    )

    const [productsRes, todayTxRes, pendingJobsRes, logsRes, upcomingRes] = await Promise.all(tasks)

    const products = productsRes.data || []
    const lowStock = products.filter((p) => p.stock_quantity <= (p.min_stock_alert || 0)).length

    setStats({
      totalProducts: productsRes.count || 0,
      lowStock,
      pendingJobs: pendingJobsRes.count || 0,
      todayTx: todayTxRes.count || 0,
    })
    setRecentLogs(logsRes.data || [])
    setUpcomingJobs(upcomingRes.data || [])
    setLoading(false)
  }

  function handleCardDoubleClick(path) {
    navigate(path)
  }

  const jobTypeColor = {
    fire_alarm: 'var(--color-danger)',
    fire_pump: 'var(--color-info)',
    lightning: 'var(--color-warning)',
    delivery: 'var(--color-success)',
  }

  const jobTypeLabel = {
    fire_alarm: 'Fire Alarm',
    fire_pump: 'Fire Pump',
    lightning: 'Lightning',
    delivery: lang === 'th' ? 'ส่งสินค้า' : 'Delivery',
  }

  const cards = []

  if (role !== 'technician') {
    cards.push({
      icon: Package,
      color: 'var(--color-navy)',
      bg: 'var(--color-bg)',
      value: stats.totalProducts,
      label: t('totalProducts'),
      path: '/products',
    })
    cards.push({
      icon: AlertTriangle,
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-bg)',
      value: stats.lowStock,
      label: t('lowStockItems'),
      path: '/products',
    })
    cards.push({
      icon: ArrowLeftRight,
      color: 'var(--color-info)',
      bg: 'var(--color-info-bg)',
      value: stats.todayTx,
      label: t('todayTransactions'),
      path: '/stock/receive',
    })
  }

  cards.push({
    icon: Wrench,
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-bg)',
    value: stats.pendingJobs,
    label: t('pendingServiceJobs'),
    path: '/services/all',
  })

  return (
    <div>
      <div className="dashboard-welcome">
        <h1>
          {t('dashboardWelcome')}, {profile?.full_name || profile?.username}
        </h1>
        <p>{t('dashboardTitle')}</p>
      </div>

      <div className="dashboard-cards">
        {cards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div
              key={idx}
              className="dashboard-card"
              onDoubleClick={() => handleCardDoubleClick(card.path)}
              title={t('doubleClickHint')}
            >
              <div className="dashboard-card-icon" style={{ background: card.bg }}>
                <Icon size={21} style={{ color: card.color }} />
              </div>
              <div className="dashboard-card-value">{loading ? '—' : card.value}</div>
              <div className="dashboard-card-label">{card.label}</div>
              <div className="dashboard-card-hint">{t('doubleClickHint')}</div>
            </div>
          )
        })}
      </div>

      <div className="dashboard-panels">
        <div className="dashboard-panel">
          <h3>
            <CalendarClock size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            {t('upcomingJobs')}
          </h3>
          {upcomingJobs.length === 0 ? (
            <div className="dashboard-empty">{t('noData')}</div>
          ) : (
            upcomingJobs.map((job) => (
              <div className="dashboard-list-item" key={job.id}>
                <span
                  className="dashboard-list-dot"
                  style={{ background: jobTypeColor[job.job_type] || 'var(--color-text-muted)' }}
                />
                <span className="dashboard-list-text">
                  <strong>{job.customer_company}</strong>
                  {job.project_name ? ` — ${job.project_name}` : ''}
                  <br />
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                    {jobTypeLabel[job.job_type]}
                  </span>
                </span>
                <span className="dashboard-list-meta">
                  {new Date(job.appointment_date).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US')}
                </span>
              </div>
            ))
          )}
        </div>

        {role === 'admin' && (
          <div className="dashboard-panel">
            <h3>
              <History size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {t('recentActivity')}
            </h3>
            {recentLogs.length === 0 ? (
              <div className="dashboard-empty">{t('noData')}</div>
            ) : (
              recentLogs.map((log) => (
                <div className="dashboard-list-item" key={log.id}>
                  <span className="dashboard-list-dot" style={{ background: 'var(--color-navy-lighter)' }} />
                  <span className="dashboard-list-text">{log.description}</span>
                  <span className="dashboard-list-meta">
                    {new Date(log.created_at).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
