import { useState, useEffect } from 'react'
import { Edit2, Trash2, Download, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { logActivity } from '../../lib/activityLog'
import { exportToExcel, importFromExcel } from '../../lib/excelUtils'
import { confirmDialog, successToast, errorToast } from '../../lib/alerts'
import Modal from '../../components/common/Modal'
import '../../styles/crud-pages.css'

const THAI_PROVINCES = [
  'Bangkok', 'Nonthaburi', 'Pathumthani', 'Pracheachip', 'Nakornpathom', 'Samutprakan', 'Samutsakhon', 'Samutsongkhram', 'Ayutthaya', 'Lopburi',
  'Singburi', 'Sukhothai', 'Phichit', 'Phetchabun', 'Ratchaburi', 'Kanchanaburi', 'Suphanaburi', 'Chachoengsao', 'Chonburi', 'Rayong',
  'Chantaburi', 'Trat', 'Nakhonratchasima', 'Buriram', 'Surin', 'Yasothon', 'Amnatcharoen', 'Mukdahan', 'Nakhonphanom', 'Sakonakhon',
  'Kalasin', 'Roi Et', 'Mahasarakham', 'Khonkaen', 'Chaiyaphum', 'Loei', 'Nongkhai', 'Udonthani', 'Uttaradit', 'Phrae', 'Nan', 'Lampang', 'Lamphun', 'Chiang Rai', 'Chiang Mai',
  'Mae Hong Son', 'Tak', 'Kamphaeng Phet', 'Pitsanulok', 'Phetchabun', 'Chumphon', 'Ranong', 'Phangnga', 'Phuket', 'Krabi', 'Trang', 'Satun', 'Nakhonsirayaya', 'Phatthalung', 'Songkhla', 'Yala', 'Narathiwat',
]

export default function AllJobs() {
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('appointment_date')
  const [sortAsc, setSortAsc] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [provinceInput, setProvinceInput] = useState('')
  const [provinceSuggestions, setProvinceSuggestions] = useState([])
  const [showProvinceSuggestions, setShowProvinceSuggestions] = useState(false)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    loadJobs()
    const channel = supabase
      .channel('jobs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_jobs' }, loadJobs)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadJobs() {
    setLoading(true)
    const { data, error } = await supabase.from('service_jobs').select('*').order('appointment_date', { ascending: false })
    if (error) errorToast(error.message)
    else setJobs(data || [])
    setLoading(false)
  }

  function handleSort(field) {
    if (sortBy === field) setSortAsc(!sortAsc)
    else { setSortBy(field); setSortAsc(true) }
  }

  const sortedJobs = [...jobs].sort((a, b) => {
    const aVal = a[sortBy] || '', bVal = b[sortBy] || ''
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortAsc ? cmp : -cmp
  })

  function openEditModal(job = null) {
    if (job) {
      setEditingId(job.id)
      setFormData(job)
      setProvinceInput(job.province || '')
    } else {
      setEditingId(null)
      setProvinceInput('')
      setFormData({ job_no: '', job_type: 'fire_alarm', customer_company: '', project_name: '', customer_name: '', contact_phone: '', site_address: '', province: '', appointment_date: new Date().toISOString().split('T')[0], status: 'scheduled', notes: '' })
    }
    setShowModal(true)
  }

  function handleProvinceInput(value) {
    setProvinceInput(value)
    if (value.trim()) {
      const filtered = THAI_PROVINCES.filter(p => p.toLowerCase().includes(value.toLowerCase()))
      setProvinceSuggestions(filtered)
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
      errorToast('กรุณากรอกข้อมูลที่จำเป็น')
      return
    }

    const dataToSave = { ...formData, province: provinceInput }
    try {
      if (editingId) {
        const { error } = await supabase.from('service_jobs').update(dataToSave).eq('id', editingId)
        if (error) throw error
        await logActivity({ userId: profile.id, username: profile.username, actionType: 'update', module: 'service_jobs', description: `แก้ไขงาน: ${formData.job_no}` })
      } else {
        const { error } = await supabase.from('service_jobs').insert([{ ...dataToSave, created_by: profile.id }])
        if (error) throw error
        await logActivity({ userId: profile.id, username: profile.username, actionType: 'create', module: 'service_jobs', description: `เพิ่มงาน: ${formData.job_no}` })
      }
      await successToast('บันทึกสำเร็จ')
      setShowModal(false)
      loadJobs()
    } catch (err) {
      errorToast(err.message)
    }
  }

  async function deleteJob(id, jobNo) {
    const result = await confirmDialog({ title: lang === 'th' ? 'ลบงาน?' : 'Delete?', text: jobNo, icon: 'warning' })
    if (!result.isConfirmed) return
    try {
      const { error } = await supabase.from('service_jobs').delete().eq('id', id)
      if (error) throw error
      await successToast('ลบสำเร็จ')
      loadJobs()
    } catch (err) {
      errorToast(err.message)
    }
  }

  async function handleExport() {
    const toExport = jobs.map((j) => ({ 'เลขที่งาน': j.job_no, 'ลูกค้า': j.customer_company, 'วันที่': j.appointment_date, 'ประเภท': j.job_type, 'จังหวัด': j.province || '-', 'สถานะ': j.status }))
    if (toExport.length === 0) { errorToast('ไม่มีข้อมูล'); return }
    exportToExcel(toExport, 'jobs', `jobs_${new Date().toISOString().split('T')[0]}`)
    await successToast('ส่งออกสำเร็จ')
  }

  async function handleImport(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const data = await importFromExcel(file)
      if (data.length === 0) { errorToast('ไฟล์ว่าง'); return }

      let insertCount = 0, updateCount = 0, errorCount = 0

      for (const row of data) {
        const job = {
          job_no: row['เลขที่งาน'] || '', job_type: row['ประเภท'] || 'fire_alarm', customer_company: row['ลูกค้า'] || '', project_name: row['โครงการ'] || '',
          customer_name: row['ผู้ติดต่อ'] || '', contact_phone: row['เบอร์โทร'] || '', site_address: row['ที่อยู่'] || '', province: row['จังหวัด'] || '',
          appointment_date: row['วันที่'] || new Date().toISOString().split('T')[0], status: 'scheduled', notes: row['หมายเหตุ'] || '',
        }

        if (!job.job_no) { errorCount++; continue }

        try {
          const { data: existing } = await supabase.from('service_jobs').select('id').eq('job_no', job.job_no).single()
          if (existing) {
            const { error } = await supabase.from('service_jobs').update(job).eq('job_no', job.job_no)
            if (!error) updateCount++
            else errorCount++
          } else {
            const { error } = await supabase.from('service_jobs').insert([{ ...job, created_by: profile.id }])
            if (!error) insertCount++
            else errorCount++
          }
        } catch (err) { errorCount++ }
      }

      await logActivity({ userId: profile.id, username: profile.username, actionType: 'create', module: 'service_jobs', description: `นำเข้างานจาก Excel: เพิ่ม ${insertCount}, อัปเดต ${updateCount}, ผิด ${errorCount}` })
      await successToast(`นำเข้า: เพิ่ม ${insertCount}, อัปเดต ${updateCount}${errorCount > 0 ? `, ผิด ${errorCount}` : ''}`)
      loadJobs()
    } catch (err) {
      errorToast(err.message)
    }
    event.target.value = ''
  }

  const statusColors = { scheduled: '#3b82f6', in_progress: '#f59e0b', completed: '#10b981', cancelled: '#ef4444', pending_approval: '#8b5cf6' }

  return (
    <div>
      <div className="crud-page-header">
        <div><h1>{lang === 'th' ? 'รายการงาน' : 'Jobs'}</h1><p>{loading ? 'โหลด...' : `${jobs.length} งาน`}</p></div>
        <div className="crud-page-actions">
          <button className="btn btn-secondary" onClick={handleExport}><Download size={16} /> Export</button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={16} /> Import
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div className="crud-table-wrapper">
        <table className="crud-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('job_no')} style={{ cursor: 'pointer' }}>{lang === 'th' ? 'เลขที่' : 'No'} {sortBy === 'job_no' && (sortAsc ? '▲' : '▼')}</th>
              <th>{lang === 'th' ? 'ลูกค้า' : 'Customer'}</th>
              <th onClick={() => handleSort('appointment_date')} style={{ cursor: 'pointer' }}>{lang === 'th' ? 'วันที่' : 'Date'} {sortBy === 'appointment_date' && (sortAsc ? '▲' : '▼')}</th>
              <th>{lang === 'th' ? 'ประเภท' : 'Type'}</th>
              <th>{lang === 'th' ? 'จังหวัด' : 'Province'}</th>
              <th>{lang === 'th' ? 'สถานะ' : 'Status'}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedJobs.map((j) => (
              <tr key={j.id}>
                <td className="code">{j.job_no}</td>
                <td>{j.customer_company}</td>
                <td>{j.appointment_date}</td>
                <td>{j.job_type}</td>
                <td>{j.province || '-'}</td>
                <td><span style={{ background: statusColors[j.status] || '#6b7280', color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>{j.status}</span></td>
                <td className="actions">
                  <button className="btn-icon" onClick={() => openEditModal(j)} disabled={profile?.role === 'technician'}><Edit2 size={16} /></button>
                  <button className="btn-icon danger" onClick={() => deleteJob(j.id, j.job_no)} disabled={profile?.role !== 'admin'}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedJobs.length === 0 && !loading && <div className="empty-state">{t('noData')}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'แก้ไข' : 'เพิ่ม'} size="lg">
        <div className="form-group"><label>เลขที่งาน *</label><input type="text" value={formData.job_no || ''} onChange={(e) => setFormData({ ...formData, job_no: e.target.value })} placeholder="JOB-001" /></div>
        <div className="form-row">
          <div className="form-group"><label>ลูกค้า *</label><input type="text" value={formData.customer_company || ''} onChange={(e) => setFormData({ ...formData, customer_company: e.target.value })} /></div>
          <div className="form-group"><label>{lang === 'th' ? 'ประเภท' : 'Type'}</label><select value={formData.job_type || 'fire_alarm'} onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}><option value="fire_alarm">Fire Alarm</option><option value="fire_pump">Fire Pump</option><option value="lightning">Lightning</option><option value="delivery">Delivery</option></select></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>{lang === 'th' ? 'สถานะ' : 'Status'}</label><select value={formData.status || 'scheduled'} onChange={(e) => setFormData({ ...formData, status: e.target.value })}><option value="pending_approval">Pending</option><option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
          <div className="form-group"><label>{lang === 'th' ? 'วันที่' : 'Date'}</label><input type="date" value={formData.appointment_date || ''} onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ position: 'relative' }}>
            <label>{lang === 'th' ? 'จังหวัด' : 'Province'}</label>
            <input type="text" value={provinceInput} onChange={(e) => handleProvinceInput(e.target.value)} onFocus={() => provinceInput && setShowProvinceSuggestions(true)} placeholder="พิมพ์หรือเลือก" />
            {showProvinceSuggestions && provinceSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--color-border)', borderTop: 'none', maxHeight: '150px', overflowY: 'auto', zIndex: 10 }}>
                {provinceSuggestions.map((prov) => (
                  <div key={prov} onClick={() => selectProvince(prov)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }} onMouseEnter={(e) => e.target.style.background = 'var(--color-bg)'} onMouseLeave={(e) => e.target.style.background = 'white'}>{prov}</div>
                ))}
              </div>
            )}
          </div>
          <div className="form-group"><label>{lang === 'th' ? 'ติดต่อ' : 'Contact'}</label><input type="text" value={formData.contact_phone || ''} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} /></div>
        </div>
        <div className="form-group"><label>{lang === 'th' ? 'ที่อยู่' : 'Address'}</label><textarea value={formData.site_address || ''} onChange={(e) => setFormData({ ...formData, site_address: e.target.value })} rows="2" /></div>
        <div className="form-group"><label>{lang === 'th' ? 'หมายเหตุ' : 'Notes'}</label><textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="2" /></div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('cancel')}</button>
          <button className="btn btn-primary" onClick={saveJob}>{t('save')}</button>
        </div>
      </Modal>
    </div>
  )
}
