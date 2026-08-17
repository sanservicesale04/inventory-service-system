import { useState, useEffect } from 'react'
import { Edit2, Trash2, Download, Upload, Eye, EyeOff, Plus } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { logActivity } from '../lib/activityLog'
import { exportToExcel, importFromExcel } from '../lib/excelUtils'
import { confirmDialog, successToast, errorToast } from '../lib/alerts'
import Modal from '../components/common/Modal'
import '../styles/crud-pages.css'

export default function AccountManagement() {
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('email')
  const [sortAsc, setSortAsc] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    full_name: '',
    role: 'user',
    is_active: true,
    password: '',
  })

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
      if (authError) throw authError

      const { data: profiles, error: profileError } = await supabase.from('profiles').select('*')
      if (profileError) throw profileError

      const combined = authUsers.users.map((user) => {
        const prof = profiles.find((p) => p.id === user.id)
        return {
          id: user.id,
          email: user.email,
          username: prof?.username || '-',
          full_name: prof?.full_name || '-',
          role: prof?.role || 'user',
          is_active: prof?.is_active !== false,
          created_at: user.created_at,
        }
      })

      setUsers(combined)
    } catch (err) {
      errorToast(err.message)
    }
    setLoading(false)
  }

  function handleSort(field) {
    if (sortBy === field) setSortAsc(!sortAsc)
    else { setSortBy(field); setSortAsc(true) }
  }

  const sortedUsers = [...users].sort((a, b) => {
    const aVal = a[sortBy] || '', bVal = b[sortBy] || ''
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortAsc ? cmp : -cmp
  })

  function openAddModal() {
    setEditingId(null)
    setFormData({ email: '', username: '', full_name: '', role: 'user', is_active: true, password: '' })
    setShowPassword(false)
    setShowModal(true)
  }

  function openEditModal(user) {
    setEditingId(user.id)
    setFormData({ email: user.email, username: user.username, full_name: user.full_name, role: user.role, is_active: user.is_active, password: '' })
    setShowPassword(false)
    setShowModal(true)
  }

  async function saveUser() {
    if (!formData.email) { errorToast('กรุณากรอก Email'); return }

    try {
      if (editingId) {
        const { error } = await supabase.from('profiles').update({
          username: formData.username,
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active,
        }).eq('id', editingId)

        if (error) throw error
        await logActivity({
          userId: profile.id,
          username: profile.username,
          actionType: 'update',
          module: 'accounts',
          description: `แก้ไขบัญชี: ${formData.email}`,
        })
      } else {
        if (!formData.password) { errorToast('กรุณากรอกรหัสผ่าน'); return }

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true,
        })

        if (authError) throw authError

        const { error: profileError } = await supabase.from('profiles').insert([{
          id: authData.user.id,
          email: formData.email,
          username: formData.username,
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active,
        }])

        if (profileError) throw profileError

        await logActivity({
          userId: profile.id,
          username: profile.username,
          actionType: 'create',
          module: 'accounts',
          description: `เพิ่มบัญชี: ${formData.email}`,
        })
      }

      await successToast(editingId ? 'อัปเดตสำเร็จ' : 'เพิ่มบัญชีสำเร็จ')
      setShowModal(false)
      loadUsers()
    } catch (err) {
      errorToast(err.message)
    }
  }

  async function deleteUser(id, email) {
    const result = await confirmDialog({ title: lang === 'th' ? 'ลบบัญชี?' : 'Delete?', text: email, icon: 'warning' })
    if (!result.isConfirmed) return

    try {
      await supabase.auth.admin.deleteUser(id)
      await logActivity({ userId: profile.id, username: profile.username, actionType: 'delete', module: 'accounts', description: `ลบบัญชี: ${email}` })
      await successToast('ลบสำเร็จ')
      loadUsers()
    } catch (err) {
      errorToast(err.message)
    }
  }

  async function handleExport() {
    const toExport = users.map((u) => ({ 'Email': u.email, 'ชื่อผู้ใช้': u.username, 'ชื่อเต็ม': u.full_name, 'บทบาท': u.role, 'สถานะ': u.is_active ? 'Active' : 'Inactive', 'สร้างเมื่อ': u.created_at }))
    if (toExport.length === 0) { errorToast('ไม่มีข้อมูล'); return }
    exportToExcel(toExport, 'accounts', `accounts_${new Date().toISOString().split('T')[0]}`)
    await successToast('ส่งออกสำเร็จ')
  }

  async function handleImport(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const data = await importFromExcel(file)
      if (data.length === 0) { errorToast('ไฟล์ว่าง'); return }

      let successCount = 0
      for (const row of data) {
        const email = row['Email'] || row['email'] || ''
        const password = row['Password'] || row['password'] || 'Temp@1234'
        if (!email) continue

        try {
          const { data: authData } = await supabase.auth.admin.createUser({
            email, password, email_confirm: true,
          })

          if (authData?.user) {
            await supabase.from('profiles').insert([{
              id: authData.user.id,
              email,
              username: row['ชื่อผู้ใช้'] || row['Username'] || '',
              full_name: row['ชื่อเต็ม'] || row['Full Name'] || '',
              role: row['บทบาท'] || row['Role'] || 'user',
              is_active: row['สถานะ'] !== 'Inactive',
            }])
            successCount++
          }
        } catch (err) {
          console.log(`Skip: ${email}`)
        }
      }

      await logActivity({
        userId: profile.id,
        username: profile.username,
        actionType: 'create',
        module: 'accounts',
        description: `นำเข้าบัญชีจาก Excel: ${successCount} รายการ`,
      })

      await successToast(`นำเข้า ${successCount} บัญชีสำเร็จ`)
      loadUsers()
    } catch (err) {
      errorToast(err.message)
    }
    event.target.value = ''
  }

  const roleLabels = { admin: lang === 'th' ? 'ผู้ดูแล' : 'Admin', user: lang === 'th' ? 'ผู้ใช้' : 'User', technician: lang === 'th' ? 'ช่าง' : 'Technician' }

  return (
    <div>
      <div className="crud-page-header">
        <div><h1>{lang === 'th' ? 'จัดการบัญชี' : 'Accounts'}</h1><p>{loading ? 'โหลด...' : `${users.length} บัญชี`}</p></div>
        <div className="crud-page-actions">
          <button className="btn btn-primary" onClick={openAddModal}><Plus size={16} /> {lang === 'th' ? 'เพิ่ม' : 'Add'}</button>
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
              <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>Email {sortBy === 'email' && (sortAsc ? '▲' : '▼')}</th>
              <th onClick={() => handleSort('username')} style={{ cursor: 'pointer' }}>{lang === 'th' ? 'ชื่อผู้ใช้' : 'Username'} {sortBy === 'username' && (sortAsc ? '▲' : '▼')}</th>
              <th>{lang === 'th' ? 'ชื่อเต็ม' : 'Full Name'}</th>
              <th>{lang === 'th' ? 'บทบาท' : 'Role'}</th>
              <th>{lang === 'th' ? 'สถานะ' : 'Status'}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((u) => (
              <tr key={u.id}>
                <td className="code">{u.email}</td>
                <td>{u.username}</td>
                <td>{u.full_name}</td>
                <td><span style={{ background: u.role === 'admin' ? '#8b5cf6' : u.role === 'technician' ? '#f59e0b' : '#3b82f6', color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>{roleLabels[u.role]}</span></td>
                <td><span style={{ background: u.is_active ? '#10b981' : '#ef4444', color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="actions">
                  <button className="btn-icon" onClick={() => openEditModal(u)}><Edit2 size={16} /></button>
                  <button className="btn-icon danger" onClick={() => deleteUser(u.id, u.email)} disabled={profile?.role !== 'admin'}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedUsers.length === 0 && !loading && <div className="empty-state">{t('noData')}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'แก้ไข' : 'เพิ่มบัญชี'} size="md">
        <div className="form-group"><label>Email *</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={editingId !== null} placeholder="user@example.com" /></div>
        <div className="form-row">
          <div className="form-group"><label>{lang === 'th' ? 'ชื่อผู้ใช้' : 'Username'}</label><input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} /></div>
          <div className="form-group"><label>{lang === 'th' ? 'ชื่อเต็ม' : 'Full Name'}</label><input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>{lang === 'th' ? 'บทบาท' : 'Role'}</label><select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}><option value="user">{roleLabels.user}</option><option value="technician">{roleLabels.technician}</option><option value="admin">{roleLabels.admin}</option></select></div>
          <div className="form-group"><label>{lang === 'th' ? 'สถานะ' : 'Status'}</label><select value={formData.is_active ? 'active' : 'inactive'} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        </div>
        {!editingId && (
          <div className="form-group" style={{ position: 'relative' }}>
            <label>{lang === 'th' ? 'รหัสผ่าน' : 'Password'} *</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" style={{ flex: 1 }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>
        )}
        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('cancel')}</button>
          <button className="btn btn-primary" onClick={saveUser}>{t('save')}</button>
        </div>
      </Modal>
    </div>
  )
}
