import { useState, useEffect } from 'react'
import { Check, X, Eye } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { logActivity } from '../lib/activityLog'
import { confirmDialog, successToast, errorToast } from '../lib/alerts'
import Modal from '../components/common/Modal'
import '../styles/crud-pages.css'

export default function PendingApprovals() {
  const { profile } = useAuth()
  const { lang } = useLanguage()
  const [pendingJobs, setPendingJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)

  useEffect(() => {
    if (profile?.role !== 'admin') {
      errorToast(lang === 'th' ? 'เฉพาะแอดมิน' : 'Admin only')
      return
    }
    loadPendingJobs()
    const channel = supabase
      .channel('pending-jobs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_jobs' }, loadPendingJobs)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadPendingJobs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('service_jobs')
      .select('*')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false })
    if (error) {
      errorToast(error.message)
    } else {
      setPendingJobs(data || [])
    }
    setLoading(false)
  }

  async function approveJob(job) {
    const result = await confirmDialog({
      title: lang === 'th' ? 'อนุมัติงาน?' : 'Approve?',
      text: job.job_no,
      icon: 'question',
      confirmText: lang === 'th' ? 'อนุมัติ' : 'Approve',
    })
    if (!result.isConfirmed) return

    try {
      const { error } = await supabase
        .from('service_jobs')
        .update({ status: 'scheduled' })
        .eq('id', job.id)
      if (error) throw error

      await logActivity({
        userId: profile.id,
        username: profile.username,
        actionType: 'update',
        module: 'service_jobs',
        description: `อนุมัติงาน: ${job.job_no}`,
      })

      await successToast(lang === 'th' ? 'อนุมัติแล้ว' : 'Approved')
      loadPendingJobs()
    } catch (err) {
      errorToast(err.message)
    }
  }

  async function rejectJob(job) {
    const result = await confirmDialog({
      title: lang === 'th' ? 'ปฏิเสธงาน?' : 'Reject?',
      text: job.job_no,
      icon: 'warning',
      confirmText: lang === 'th' ? 'ปฏิเสธ' : 'Reject',
    })
    if (!result.isConfirmed) return

    try {
      const { error } = await supabase
        .from('service_jobs')
        .update({ status: 'cancelled' })
        .eq('id', job.id)
      if (error) throw error

      await logActivity({
        userId: profile.id,
        username: profile.username,
        actionType: 'update',
        module: 'service_jobs',
        description: `ปฏิเสธงาน: ${job.job_no}`,
      })

      await successToast(lang === 'th' ? 'ปฏิเสธแล้ว' : 'Rejected')
      loadPendingJobs()
    } catch (err) {
      errorToast(err.message)
    }
  }

  if (profile?.role !== 'admin') {
    return <div style={{ padding: 40, textAlign: 'center' }}>{lang === 'th' ? 'ไม่มีสิทธิ์' : 'No access'}</div>
  }

  return (
    <div>
      <div className="crud-page-header">
        <div>
          <h1>🔔 {lang === 'th' ? 'อนุมัติงานที่รออนุมัติ' : 'Pending Approvals'}</h1>
          <p>
            {loading ? 'โหลด...' : `${pendingJobs.length} ${lang === 'th' ? 'งานรออนุมัติ' : 'jobs pending'}`}
          </p>
        </div>
      </div>

      {pendingJobs.length === 0 && !loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: 60,
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            {lang === 'th' ? 'ไม่มีงานที่รออนุมัติ' : 'No pending jobs'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
          {pendingJobs.map((job) => (
            <div
              key={job.id}
              style={{
                background: 'var(--color-surface)',
                border: '2px solid var(--color-primary)',
                borderRadius: 'var(--radius-lg)',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{job.job_no}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{job.job_type}</div>
                </div>
                <span
                  style={{
                    background: '#8b5cf6',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  PENDING
                </span>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>
                  <strong>{lang === 'th' ? 'ลูกค้า:' : 'Customer:'}</strong> {job.customer_company}
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>
                  <strong>{lang === 'th' ? 'วันที่:' : 'Date:'}</strong> {job.appointment_date}
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>
                  <strong>{lang === 'th' ? 'ที่อยู่:' : 'Address:'}</strong> {job.site_address}
                </div>
                {job.notes && (
                  <div style={{ fontSize: '0.85rem', marginBottom: 8, color: 'var(--color-text-muted)' }}>
                    <strong>{lang === 'th' ? 'หมายเหตุ:' : 'Notes:'}</strong> {job.notes}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => approveJob(job)}
                  style={{
                    flex: 1,
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  <Check size={16} /> {lang === 'th' ? 'อนุมัติ' : 'Approve'}
                </button>
                <button
                  onClick={() => rejectJob(job)}
                  style={{
                    flex: 1,
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  <X size={16} /> {lang === 'th' ? 'ปฏิเสธ' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
