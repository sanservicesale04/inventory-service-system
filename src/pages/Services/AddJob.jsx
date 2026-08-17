import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { logActivity } from '../../lib/activityLog'
import { successToast, errorToast } from '../../lib/alerts'
import '../../styles/crud-pages.css'

export default function AddJob() {
  const { profile } = useAuth()
  const { lang } = useLanguage()
  const [formData, setFormData] = useState({
    job_no: '',
    job_type: 'fire_alarm',
    customer_company: '',
    project_name: '',
    customer_name: '',
    contact_phone: '',
    site_address: '',
    province: 'Bangkok',
    appointment_date: new Date().toISOString().split('T')[0],
    status: profile?.role === 'technician' ? 'pending_approval' : 'scheduled',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.job_no || !formData.customer_company) {
      errorToast('กรุณากรอกข้อมูลที่จำเป็น')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('service_jobs').insert([{ ...formData, created_by: profile.id }])
      if (error) throw error

      await logActivity({
        userId: profile.id,
        username: profile.username,
        actionType: 'create',
        module: 'service_jobs',
        description: `เพิ่มงาน: ${formData.job_no}${profile.role === 'technician' ? ' (รอการอนุมัติ)' : ''}`,
      })

      await successToast('บันทึกสำเร็จ')
      setFormData({
        job_no: '',
        job_type: 'fire_alarm',
        customer_company: '',
        project_name: '',
        customer_name: '',
        contact_phone: '',
        site_address: '',
        province: 'Bangkok',
        appointment_date: new Date().toISOString().split('T')[0],
        status: profile?.role === 'technician' ? 'pending_approval' : 'scheduled',
        notes: '',
      })
    } catch (err) {
      errorToast(err.message)
    }
    setSubmitting(false)
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="crud-page-header">
        <div>
          <h1>{lang === 'th' ? 'เพิ่มงานบริการใหม่' : 'Add Job'}</h1>
          {profile?.role === 'technician' && <p style={{ color: '#8b5cf6' }}>⚠️ {lang === 'th' ? 'งานจะรออนุมัติจากผู้ดูแลระบบ' : 'Pending approval'}</p>}
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', padding: 24, borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>เลขที่งาน * ({lang === 'th' ? 'auto' : 'auto'})</label>
            <input
              type="text"
              value={formData.job_no}
              onChange={(e) => setFormData({ ...formData, job_no: e.target.value })}
              placeholder="JOB-001"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{lang === 'th' ? 'ชื่อลูกค้า' : 'Customer'} *</label>
              <input
                type="text"
                value={formData.customer_company}
                onChange={(e) => setFormData({ ...formData, customer_company: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>{lang === 'th' ? 'ประเภท' : 'Type'} *</label>
              <select value={formData.job_type} onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}>
                <option value="fire_alarm">Fire Alarm</option>
                <option value="fire_pump">Fire Pump</option>
                <option value="lightning">Lightning</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>{lang === 'th' ? 'ชื่อโปรเจกต์' : 'Project'}</label>
            <input
              type="text"
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{lang === 'th' ? 'ชื่อผู้ติดต่อ' : 'Contact Name'}</label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{lang === 'th' ? 'เบอร์โทร' : 'Phone'}</label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>{lang === 'th' ? 'ที่อยู่สถานที่' : 'Address'} *</label>
            <textarea
              value={formData.site_address}
              onChange={(e) => setFormData({ ...formData, site_address: e.target.value })}
              rows="3"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{lang === 'th' ? 'จังหวัด' : 'Province'}</label>
              <select value={formData.province} onChange={(e) => setFormData({ ...formData, province: e.target.value })}>
                <option value="Bangkok">Bangkok</option>
                <option value="Nonthaburi">Nonthaburi</option>
                <option value="Pathumthani">Pathumthani</option>
              </select>
            </div>
            <div className="form-group">
              <label>{lang === 'th' ? 'วันที่นัดหมาย' : 'Appointment'} *</label>
              <input
                type="date"
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>{lang === 'th' ? 'หมายเหตุ' : 'Notes'}</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="3"
            />
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'บันทึก...' : lang === 'th' ? 'บันทึก' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
