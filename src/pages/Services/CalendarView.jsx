import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { logActivity } from '../../lib/activityLog'
import { confirmDialog, successToast, errorToast } from '../../lib/alerts'
import Modal from '../../components/common/Modal'
import '../../styles/crud-pages.css'

const THAI_PROVINCES = ['Bangkok', 'Nonthaburi', 'Pathumthani', 'Pracheachip', 'Nakornpathom', 'Samutprakan', 'Samutsakhon', 'Samutsongkhram', 'Ayutthaya', 'Lopburi', 'Singburi', 'Sukhothai', 'Phichit', 'Phetchabun', 'Ratchaburi', 'Kanchanaburi', 'Suphanaburi', 'Chachoengsao', 'Chonburi', 'Rayong', 'Chantaburi', 'Trat', 'Nakhonratchasima', 'Buriram', 'Surin', 'Yasothon', 'Amnatcharoen', 'Mukdahan', 'Nakhonphanom', 'Sakonakhon', 'Kalasin', 'Roi Et', 'Mahasarakham', 'Khonkaen', 'Chaiyaphum', 'Loei', 'Nongkhai', 'Udonthani', 'Uttaradit', 'Phrae', 'Nan', 'Lampang', 'Lamphun', 'Chiang Rai', 'Chiang Mai', 'Mae Hong Son', 'Tak', 'Kamphaeng Phet', 'Pitsanulok', 'Chumphon', 'Ranong', 'Phangnga', 'Phuket', 'Krabi', 'Trang', 'Satun', 'Phatthalung', 'Songkhla', 'Yala', 'Narathiwat']

// วันหยุดนักขัตฤกษ์ประเทศไทย 2569
const THAI_HOLIDAYS = {
  '2026-01-01': 'วันขึ้นปีใหม่',
  '2026-01-02': 'วันหยุดพิเศษ (เพิ่มเติมกรณีพิเศษ ตามมติ ครม.)',
  '2026-03-03': 'วันมาฆบูชา',
  '2026-04-06': 'วันจักรี',
  '2026-04-13': 'วันสงกรานต์',
  '2026-04-14': 'วันสงกรานต์',
  '2026-04-15': 'วันสงกรานต์',
  '2026-05-01': 'วันแรงงานแห่งชาติ',
  '2026-05-04': 'วันฉัตรมงคล',
  '2026-05-13': 'วันพืชมงคล',
  '2026-05-31': 'วันวิสาขบูชา',
  '2026-06-01': 'วันหยุดชดเชยวันวิสาขบูชา',
  '2026-06-03': 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี',
  '2026-07-28': 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว ร.10',
  '2026-07-29': 'วันอาสาฬหบูชา',
  '2026-07-30': 'วันเข้าพรรษา',
  '2026-08-12': 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง และวันแม่แห่งชาติ',
  '2026-10-13': 'วันคล้ายวันสวรรคต พระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร',
  '2026-10-23': 'วันปิยมหาราช',
  '2026-12-05': 'วันคล้ายวันพระบรมราชสมภพ ร.9, วันชาติ และวันพ่อแห่งชาติ',
  '2026-12-07': 'วันหยุดชดเชยวันพ่อแห่งชาติ',
  '2026-12-10': 'วันรัฐธรรมนูญ',
  '2026-12-31': 'วันสิ้นปี'
}

export default function CalendarView({ jobType, title }) {
  const { profile } = useAuth()
  const { lang } = useLanguage()
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  })
  const [jobs, setJobs] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [showJobsModal, setShowJobsModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingJobId, setEditingJobId] = useState(null)
  const [provinceInput, setProvinceInput] = useState('')
  const [provinceSuggestions, setProvinceSuggestions] = useState([])
  const [showProvinceSuggestions, setShowProvinceSuggestions] = useState(false)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    loadJobs()
    const channel = supabase.channel('calendar-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'service_jobs' }, loadJobs).subscribe()
    return () => supabase.removeChannel(channel)
  }, [jobType])

  async function loadJobs() {
    const { data, error } = await supabase.from('service_jobs').select('*').eq('job_type', jobType)
    if (error) errorToast(error.message)
    else setJobs(data || [])
  }

  function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  function getFirstDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  function getJobsForDate(dateStr) {
    return jobs.filter((j) => j.appointment_date === dateStr)
  }

  function getHolidayForDate(dateStr) {
    return THAI_HOLIDAYS[dateStr] || null
  }

  function handlePrevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  function handleNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  function handleDateClick(day) {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayJobs = getJobsForDate(dateStr)
    
    if (dayJobs.length > 0) {
      setSelectedDate(dateStr)
      setShowJobsModal(true)
    } else {
      openAddJobModal(dateStr)
    }
  }

  function openAddJobModal(dateStr) {
    const dayJobs = getJobsForDate(dateStr)
    if (dayJobs.length >= 10) {
      errorToast('ได้งานสูงสุดแล้ว (10 งาน/วัน)')
      return
    }
    setSelectedDate(dateStr)
    setEditingJobId(null)
    setFormData({ job_no: '', customer_company: '', project_name: '', customer_name: '', contact_phone: '', site_address: '', province: '', appointment_date: dateStr, notes: '', job_type: jobType, status: 'scheduled' })
    setProvinceInput('')
    setShowAddModal(true)
  }

  function openEditJobModal(job) {
    setEditingJobId(job.id)
    setFormData(job)
    setProvinceInput(job.province || '')
    setShowAddModal(true)
  }

  function handleProvinceInput(value) {
    setProvinceInput(value)
    if (value.trim()) {
      setProvinceSuggestions(THAI_PROVINCES.filter(p => p.toLowerCase().includes(value.toLowerCase())))
      setShowProvinceSuggestions(true)
    } else {
      setProvinceSuggestions([])
      setShowProvinceSuggestions(false)
    }
  }

  function selectProvince(province) {
    setProvinceInput(province)
    setFormData({ ...formData, province })
    setShowProvinceSuggestions(false)
  }

  async function saveJob() {
    if (!formData.job_no || !formData.customer_company) {
      errorToast('กรุณากรอก เลขที่งาน และชื่อลูกค้า')
      return
    }

    try {
      const dataToSave = { ...formData, province: provinceInput }
      if (editingJobId) {
        const { error } = await supabase.from('service_jobs').update(dataToSave).eq('id', editingJobId)
        if (error) throw error
        await logActivity({ userId: profile.id, username: profile.username, actionType: 'update', module: 'service_jobs', description: `แก้ไขจากปฏิทิน: ${formData.job_no}` })
      } else {
        const { error } = await supabase.from('service_jobs').insert([{ ...dataToSave, created_by: profile.id }])
        if (error) throw error
        await logActivity({ userId: profile.id, username: profile.username, actionType: 'create', module: 'service_jobs', description: `เพิ่มจากปฏิทิน: ${formData.job_no}` })
      }
      await successToast('บันทึกสำเร็จ')
      setShowAddModal(false)
      setShowJobsModal(false)
      loadJobs()
    } catch (err) {
      errorToast(err.message)
    }
  }

  async function deleteJob(id, jobNo) {
    const result = await confirmDialog({ title: 'ลบงาน?', text: jobNo, icon: 'warning' })
    if (!result.isConfirmed) return
    try {
      const { error } = await supabase.from('service_jobs').delete().eq('id', id)
      if (error) throw error
      await successToast('ลบสำเร็จ')
      loadJobs()
      setShowJobsModal(false)
    } catch (err) {
      errorToast(err.message)
    }
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const monthName = currentDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' })
  const days = []

  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const dayJobs = selectedDate ? getJobsForDate(selectedDate) : []
  const statusColors = { scheduled: '#3b82f6', in_progress: '#f59e0b', completed: '#10b981', cancelled: '#ef4444', pending_approval: '#8b5cf6' }

  const isToday = (day) => {
    const today = new Date()
    return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()
  }

  return (
    <div>
      <div className="crud-page-header">
        <div><h1>{title || 'ปฏิทิน'}</h1><p>คลิกวันเพื่อดูหรือเพิ่มงาน</p></div>
      </div>

      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
          <button onClick={handlePrevMonth} style={{ background: 'var(--color-bg)', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{monthName}</h2>
          <button onClick={handleNextMonth} style={{ background: 'var(--color-bg)', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}><ChevronRight size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 1 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', padding: '8px 4px', color: 'var(--color-text-muted)' }}>{day}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, backgroundColor: 'var(--color-border)', padding: 1, borderRadius: '6px', overflow: 'hidden' }}>
          {days.map((day, idx) => {
            const dateStr = day !== null ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null
            const dayJobs = dateStr ? getJobsForDate(dateStr) : []
            const holiday = dateStr ? getHolidayForDate(dateStr) : null

            return (
              <div key={idx} onClick={() => day && handleDateClick(day)} style={{ background: day === null ? 'var(--color-border)' : 'var(--color-surface)', padding: '6px', minHeight: '100px', maxHeight: '200px', cursor: day ? 'pointer' : 'default', border: isToday(day) ? '2px solid var(--color-primary)' : 'none', overflow: 'auto', display: 'flex', flexDirection: 'column' }} onMouseEnter={(e) => { if (day) e.currentTarget.style.background = 'var(--color-bg)' }} onMouseLeave={(e) => { if (day) e.currentTarget.style.background = 'var(--color-surface)' }}>
                {day && (
                  <>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 3, sticky: 'top', background: 'inherit', zIndex: 1 }}>{day}</div>
                    {holiday && <div style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 600, marginBottom: 2, lineHeight: '1.1', wordBreak: 'break-word', whiteSpace: 'normal' }}>{holiday}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, overflow: 'auto' }}>
                      {dayJobs.map((job) => (
                        <div key={job.id} style={{ background: statusColors[job.status] || '#6b7280', color: 'white', padding: '2px 3px', borderRadius: '2px', fontSize: '0.6rem', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.1', flexShrink: 0 }} title={job.job_no}>{job.job_no}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showJobsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20, 38, 64, 0.25)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowJobsModal(false)}>
          <div style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '12px', padding: 24, maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(20, 38, 64, 0.18)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{selectedDate} ({dayJobs.length} งาน)</h3>
              <button onClick={() => setShowJobsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
            </div>

            {dayJobs.length < 10 && (
              <button onClick={() => { setShowJobsModal(false); openAddJobModal(selectedDate) }} style={{ width: '100%', marginBottom: 12, padding: 10, background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>+ เพิ่มงานใหม่</button>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dayJobs.map((job) => (
                <div key={job.id} style={{ background: 'var(--color-bg)', padding: 12, borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{job.job_no}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{job.customer_company}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEditJobModal(job)} style={{ padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}><Edit2 size={14} /></button>
                      <button onClick={() => deleteJob(job.id, job.job_no)} style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    <div>📍 {job.site_address}</div>
                    <div>📞 {job.contact_phone || '-'}</div>
                    {job.province && <div>📌 {job.province}</div>}
                    <span style={{ background: statusColors[job.status], color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: '0.75rem', fontWeight: 600, display: 'inline-block', marginTop: 4 }}>{job.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title={editingJobId ? `แก้ไข` : `เพิ่มงาน - ${selectedDate}`} size="lg">
        <div className="form-group"><label>เลขที่งาน *</label><input type="text" value={formData.job_no || ''} onChange={(e) => setFormData({ ...formData, job_no: e.target.value })} placeholder="JOB-001" /></div>
        <div className="form-row">
          <div className="form-group"><label>ลูกค้า *</label><input type="text" value={formData.customer_company || ''} onChange={(e) => setFormData({ ...formData, customer_company: e.target.value })} /></div>
          <div className="form-group"><label>โครงการ</label><input type="text" value={formData.project_name || ''} onChange={(e) => setFormData({ ...formData, project_name: e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ position: 'relative' }}>
            <label>จังหวัด</label>
            <input type="text" value={provinceInput} onChange={(e) => handleProvinceInput(e.target.value)} onFocus={() => provinceInput && setShowProvinceSuggestions(true)} placeholder="พิมพ์หรือเลือก" />
            {showProvinceSuggestions && provinceSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--color-border)', borderTop: 'none', maxHeight: '150px', overflowY: 'auto', zIndex: 10 }}>
                {provinceSuggestions.map((prov) => (
                  <div key={prov} onClick={() => selectProvince(prov)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }} onMouseEnter={(e) => e.target.style.background = 'var(--color-bg)'} onMouseLeave={(e) => e.target.style.background = 'white'}>{prov}</div>
                ))}
              </div>
            )}
          </div>
          <div className="form-group"><label>ติดต่อ</label><input type="text" value={formData.contact_phone || ''} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} /></div>
        </div>
        <div className="form-group"><label>ที่อยู่</label><textarea value={formData.site_address || ''} onChange={(e) => setFormData({ ...formData, site_address: e.target.value })} rows="2" /></div>
        <div className="form-group"><label>หมายเหตุ</label><textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="2" /></div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={saveJob}>บันทึก</button>
        </div>
      </Modal>
    </div>
  )
}
