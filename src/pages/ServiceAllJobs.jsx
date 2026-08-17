import { useState, useEffect } from 'react'
import { Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { logActivity } from '../lib/activityLog'
import { confirmDialog, successToast, errorToast } from '../lib/alerts'
import Modal from '../components/common/Modal'
import '../styles/crud-pages.css'

export default function ServiceAllJobs() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [jobs, setJobs] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [formData, setFormData] = useState({
    job_no: '',
    job_type: 'fire_alarm',
    customer_company: '',
    project_name: '',
    customer_name: '',
    contact_phone: '',
    site_address: '',
    province: '',
    appointment_date: new Date().toISOString().split('T')[0],
    technician_id: null,
    status: 'scheduled',
    notes: '',
  })
  const [provinces, setProvinces] = useState([])
  const [technicians, setTechnicians] = useState([])

  useEffect(() => {
    loadJobs()
    loadProvinces()
    loadTechnicians()
    const ch = supabase.channel('jobs-ch').on('postgres_changes', { event: '*', schema: 'public', table: 'service_jobs' }, loadJobs).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function loadJobs() {
    const { data } = await supabase.from('service_jobs').select('*').order('appointment_date', { ascending: false })
    setJobs(data || [])
  }

  async function loadProvinces() {
    const { data } = await supabase.from('provinces').select('*').order('name_th')
    setProvinces(data || [])
  }

  async function loadTechnicians() {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'technician')
    setTechnicians(data || [])
  }

  function openModal(job = null) {
    if (job) {
      setEditingJob(job)
      setFormData(job)
    } else {
      setEditingJob(null)
      setFormData({
        job_no: `BL-${new Date().getFullYear()}-${String(jobs.length + 1).padStart(3, '0')}`,
        job_type: 'fire_alarm',
        customer_company: '',
        project_name: '',
        customer_name: '',
        contact_phone: '',
        site_address: '',
        province: '',
        appointment_date: new Date().toISOString().split('T')[0],
        technician_id: null,
        status: 'scheduled',
        notes: '',
      })
    }
    setShowModal(true)
  }

  async function saveJob() {
    if (!formData.job_no || !formData.customer_company || !formData.appointment_date) {
      await errorToast('กรุณากรอกข้อมูลให้ครบ')
      return
    }

    try {
      const saveData = {
        ...formData,
        created_by: profile.id,
        technician_name_snapshot: technicians.find((t) => t.id === formData.technician_id)?.full_name || '',
      }
      if (editingJob) {
        const { id, created_at, created_by, ...upd } = formData
        await supabase.from('service_jobs').update(upd).eq('id', editingJob.id)
      } else {
        await supabase.from('service_jobs').insert(saveData)
      }

      await logActivity({
        userId: profile.id,
        username: profile.username,
        actionType: editingJob ? 'update' : 'create',
        module: 'service_jobs',
        description: `${editingJob ? 'แก้ไข' : 'เพิ่ม'} งาน: ${formData.job_no}`,
      })

      await successToast('บันทึกสำเร็จ')
      setShowModal(false)
      loadJobs()
    } catch (err) {
      await errorToast(err.message)
    }
  }

  async function approveJob(jobId) {
    try {
      await supabase.from('service_jobs').update({ status: 'scheduled' }).eq('id', jobId)
      await logActivity({
        userId: profile.id,
        username: profile.username,
        actionType: 'update',
        module: 'service_jobs',
        description: `อนุมัติงาน ID: ${jobId}`,
      })
      await successToast('อนุมัติแล้ว')
      loadJobs()
    } catch (err) {
      await errorToast(err.message)
    }
  }

  async function deleteJob(id) {
    const result = await confirmDialog({ title: 'ลบงาน?', icon: 'warning' })
    if (!result.isConfirmed) return
    try {
      await supabase.from('service_jobs').delete().eq('id', id)
      await logActivity({
        userId: profile.id,
        username: profile.username,
        actionType: 'delete',
        module: 'service_jobs',
        description: `ลบงาน ID: ${id}`,
      })
      await successToast('ลบสำเร็จ')
      loadJobs()
    } catch (err) {
      await errorToast(err.message)
    }
  }

  const statusColor = { pending_approval: '#B8860B', scheduled: '#2563A8', in_progress: '#7A1F2B', completed: '#1F7A4D', cancelled: '#6B7280' }
  const jobTypeLabel = { fire_alarm: 'Fire Alarm', fire_pump: 'Fire Pump', lightning: 'Lightning', delivery: 'Delivery' }

  return (
    <div>
      <div className="crud-page-header">
        <h1>รายการงานบริการทั้งหมด</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + เพิ่มงาน
        </button>
      </div>

      <div className="crud-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="crud-table">
          <thead>
            <tr>
              <th>เลขที่งาน</th>
              <th>ประเภท</th>
              <th>บริษัทลูกค้า</th>
              <th>โครงการ</th>
              <th>วันที่นัด</th>
              <th>ช่าง</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="code">{job.job_no}</td>
                <td>{jobTypeLabel[job.job_type] || job.job_type}</td>
                <td>{job.customer_company}</td>
                <td>{job.project_name || '-'}</td>
                <td>{job.appointment_date}</td>
                <td>{job.technician_name_snapshot || '-'}</td>
                <td>
                  <span
                    style={{
                      background: statusColor[job.status],
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    {job.status === 'pending_approval' && 'รออนุมัติ'}
                    {job.status === 'scheduled' && 'กำหนดแล้ว'}
                    {job.status === 'in_progress' && 'ดำเนินการ'}
                    {job.status === 'completed' && 'เสร็จสิ้น'}
                    {job.status === 'cancelled' && 'ยกเลิก'}
                  </span>
                </td>
                <td className="actions">
                  {job.status === 'pending_approval' && profile?.role === 'admin' && (
                    <button className="btn-icon" onClick={() => approveJob(job.id)} title="Approve">
                      <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                    </button>
                  )}
                  <button className="btn-icon" onClick={() => openModal(job)} title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button className="btn-icon danger" onClick={() => deleteJob(job.id)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && <div className="empty-state">{t('noData')}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="งานบริการ" size="lg">
        <div className="form-row">
          <div className="form-group">
            <label>เลขที่งาน *</label>
            <input type="text" value={formData.job_no} onChange={(e) => setFormData({ ...formData, job_no: e.target.value })} />
          </div>
          <div className="form-group">
            <label>ประเภทงาน</label>
            <select value={formData.job_type} onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}>
              <option value="fire_alarm">Fire Alarm</option>
              <option value="fire_pump">Fire Pump</option>
              <option value="lightning">Lightning</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>บริษัทลูกค้า *</label>
            <input
              type="text"
              value={formData.customer_company}
              onChange={(e) => setFormData({ ...formData, customer_company: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>โครงการ</label>
            <input type="text" value={formData.project_name} onChange={(e) => setFormData({ ...formData, project_name: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>ชื่อลูกค้า</label>
            <input type="text" value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>เบอร์ติดต่อ</label>
            <input type="tel" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label>สถานที่เข้างาน</label>
          <input type="text" value={formData.site_address} onChange={(e) => setFormData({ ...formData, site_address: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>จังหวัด</label>
            <select value={formData.province} onChange={(e) => setFormData({ ...formData, province: e.target.value })}>
              <option value="">-- เลือก --</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.name_th}>
                  {p.name_th}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>วันที่นัดเข้างาน *</label>
            <input type="date" value={formData.appointment_date} onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>ช่างผู้รับผิดชอบ</label>
            <select value={formData.technician_id} onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}>
              <option value="">-- เลือก --</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>สถานะ</label>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
              <option value="scheduled">กำหนดแล้ว</option>
              <option value="in_progress">ดำเนินการ</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="pending_approval">รออนุมัติ</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>หมายเหตุ</label>
          <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="3" />
        </div>
        <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
            ยกเลิก
          </button>
          <button className="btn btn-primary" onClick={saveJob}>
            บันทึก
          </button>
        </div>
      </Modal>
    </div>
  )
}
