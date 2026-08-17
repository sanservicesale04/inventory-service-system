import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useLanguage } from '../contexts/LanguageContext'
import Modal from '../components/common/Modal'
import '../styles/crud-pages.css'

export default function ServiceCalendar({ jobType, title }) {
  const { lang } = useLanguage()
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1))
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)

  useEffect(() => {
    loadJobs()
    const ch = supabase.channel('jobs-cal').on('postgres_changes', { event: '*', schema: 'public', table: 'service_jobs' }, loadJobs).subscribe()
    return () => supabase.removeChannel(ch)
  }, [currentDate])

  async function loadJobs() {
    const yr = currentDate.getFullYear()
    const mo = currentDate.getMonth()
    const first = new Date(yr, mo, 1).toISOString().split('T')[0]
    const last = new Date(yr, mo + 1, 0).toISOString().split('T')[0]
    const { data } = await supabase
      .from('service_jobs')
      .select('*')
      .eq('job_type', jobType)
      .gte('appointment_date', first)
      .lte('appointment_date', last)
    setJobs(data || [])
  }

  const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const firstDay = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  const days = Array.from({ length: daysInMonth(currentDate) }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDay(currentDate) }, () => null)

  const jobsForDate = (day) => jobs.filter((j) => parseInt(j.appointment_date.split('-')[2]) === day)

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  const months_th = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>{title}</h1>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          padding: '16px',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
        }}
      >
        <button className="btn btn-secondary" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
          <ChevronLeft size={16} /> ก่อนหน้า
        </button>
        <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>
          {lang === 'th' ? months_th[currentDate.getMonth()] : monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <button className="btn btn-secondary" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
          ถัดไป <ChevronRight size={16} />
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
          background: 'var(--color-border)',
          padding: '2px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}
      >
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} style={{ background: 'var(--color-navy)', color: 'white', padding: '8px', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
            {d}
          </div>
        ))}
        {blanks.map((_, i) => (
          <div key={`blank-${i}`} style={{ background: 'var(--color-bg)', minHeight: '100px' }} />
        ))}
        {days.map((day) => {
          const dayJobs = jobsForDate(day)
          return (
            <div
              key={day}
              style={{
                background: 'var(--color-surface)',
                minHeight: '100px',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '0.9rem',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--color-primary)' }}>{day}</div>
              {dayJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  style={{
                    background: 'var(--color-primary-bg)',
                    color: 'var(--color-primary)',
                    padding: '4px',
                    borderRadius: '3px',
                    fontSize: '0.75rem',
                    marginBottom: '2px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={job.customer_company}
                >
                  {job.customer_company}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <Modal open={!!selectedJob} onClose={() => setSelectedJob(null)} title="รายละเอียดงาน" glass>
        {selectedJob && (
          <div style={{ fontSize: '0.95rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['เลขที่งาน', selectedJob.job_no],
                  ['บริษัท', selectedJob.customer_company],
                  ['โครงการ', selectedJob.project_name || '-'],
                  ['ลูกค้า', selectedJob.customer_name || '-'],
                  ['เบอร์', selectedJob.contact_phone || '-'],
                  ['ที่อยู่', selectedJob.site_address || '-'],
                  ['จังหวัด', selectedJob.province || '-'],
                  ['ช่าง', selectedJob.technician_name_snapshot || '-'],
                  ['สถานะ', selectedJob.status],
                  ['หมายเหตุ', selectedJob.notes || '-'],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px', fontWeight: 600, width: '30%' }}>{k}</td>
                    <td style={{ padding: '8px' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  )
}
