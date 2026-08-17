import { useState, useEffect } from 'react'
import { Edit2, Trash2, Download, Upload, Plus, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { logActivity } from '../lib/activityLog'
import { exportToExcel, importFromExcel } from '../lib/excelUtils'
import { confirmDialog, successToast, errorToast } from '../lib/alerts'
import Modal from '../components/common/Modal'
import '../styles/crud-pages.css'

export default function Products() {
  const { profile } = useAuth()
  const { t, lang } = useLanguage()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('product_code')
  const [sortAsc, setSortAsc] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    loadProducts()
    const channel = supabase.channel('products-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadProducts).subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').order('product_code', { ascending: true })
    if (error) errorToast(error.message)
    else setProducts(data || [])
    setLoading(false)
  }

  function handleSort(field) {
    if (sortBy === field) setSortAsc(!sortAsc)
    else { setSortBy(field); setSortAsc(true) }
  }

  // ค้นหาจาก product_code หรือ product_name
  const filteredProducts = products.filter(p => 
    p.product_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aVal = a[sortBy] || '', bVal = b[sortBy] || ''
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortAsc ? cmp : -cmp
  })

  function openAddModal() {
    setEditingId(null)
    setFormData({ product_code: '', product_name: '', brand: '', category: '', quantity: 0, unit: 'ชิ้น', notes: '' })
    setShowModal(true)
  }

  function openEditModal(product) {
    setEditingId(product.id)
    setFormData(product)
    setShowModal(true)
  }

  async function saveProduct() {
    if (!formData.product_code || !formData.product_name) {
      errorToast('กรุณากรอก รหัส และชื่อสินค้า')
      return
    }

    try {
      if (editingId) {
        const { error } = await supabase.from('products').update(formData).eq('id', editingId)
        if (error) throw error
        await logActivity({ userId: profile.id, username: profile.username, actionType: 'update', module: 'products', description: `แก้ไข: ${formData.product_code}` })
      } else {
        const { error } = await supabase.from('products').insert([formData])
        if (error) throw error
        await logActivity({ userId: profile.id, username: profile.username, actionType: 'create', module: 'products', description: `เพิ่ม: ${formData.product_code}` })
      }
      await successToast('บันทึกสำเร็จ')
      setShowModal(false)
      loadProducts()
    } catch (err) {
      errorToast(err.message)
    }
  }

  async function deleteProduct(id, code) {
    const result = await confirmDialog({ title: lang === 'th' ? 'ลบสินค้า?' : 'Delete?', text: code, icon: 'warning' })
    if (!result.isConfirmed) return
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      await successToast('ลบสำเร็จ')
      loadProducts()
    } catch (err) {
      errorToast(err.message)
    }
  }

  async function handleExport() {
    const toExport = sortedProducts.map(p => ({ 'รหัส': p.product_code, 'ชื่อ': p.product_name, 'แบรนด์': p.brand, 'หมวดหมู่': p.category, 'จำนวน': p.quantity, 'หน่วย': p.unit, 'หมายเหตุ': p.notes || '-' }))
    if (toExport.length === 0) { errorToast('ไม่มีข้อมูล'); return }
    exportToExcel(toExport, 'products', `products_${new Date().toISOString().split('T')[0]}`)
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
        const product = {
          product_code: row['รหัส'] || row['product_code'] || '',
          product_name: row['ชื่อ'] || row['product_name'] || '',
          brand: row['แบรนด์'] || row['brand'] || '',
          category: row['หมวดหมู่'] || row['category'] || '',
          quantity: parseInt(row['จำนวน'] || row['quantity'] || '0'),
          unit: row['หน่วย'] || row['unit'] || 'ชิ้น',
          notes: row['หมายเหตุ'] || row['notes'] || '',
        }

        if (!product.product_code) { errorCount++; continue }

        try {
          const { data: existing } = await supabase.from('products').select('id').eq('product_code', product.product_code).single()

          if (existing) {
            const { error } = await supabase.from('products').update(product).eq('product_code', product.product_code)
            if (!error) updateCount++
            else errorCount++
          } else {
            const { error } = await supabase.from('products').insert([product])
            if (!error) insertCount++
            else errorCount++
          }
        } catch (err) { errorCount++ }
      }

      await logActivity({ userId: profile.id, username: profile.username, actionType: 'create', module: 'products', description: `นำเข้า: เพิ่ม ${insertCount}, อัปเดต ${updateCount}` })
      await successToast(`นำเข้า: เพิ่ม ${insertCount}, อัปเดต ${updateCount}${errorCount > 0 ? `, ผิด ${errorCount}` : ''}`)
      loadProducts()
    } catch (err) {
      errorToast(err.message)
    }
    event.target.value = ''
  }

  return (
    <div>
      <div className="crud-page-header">
        <div><h1>{lang === 'th' ? 'รายการสินค้า' : 'Products'}</h1><p>{loading ? 'โหลด...' : `${sortedProducts.length} / ${products.length}`}</p></div>
        <div className="crud-page-actions">
          <button className="btn btn-primary" onClick={openAddModal}><Plus size={16} /> {lang === 'th' ? 'เพิ่ม' : 'Add'}</button>
          <button className="btn btn-secondary" onClick={handleExport}><Download size={16} /> Export</button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={16} /> Import
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-surface)', padding: 12, borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <Search size={18} style={{ color: 'var(--color-text-muted)' }} />
        <input 
          type="text" 
          placeholder={lang === 'th' ? 'ค้นหา รหัส หรือ ชื่อสินค้า...' : 'Search code or name...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: 'none', background: 'transparent', fontSize: '0.9rem', outline: 'none' }}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            style={{ padding: '4px 8px', background: 'var(--color-bg)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            ✕
          </button>
        )}
      </div>

      <div className="crud-table-wrapper">
        <table className="crud-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('product_code')} style={{ cursor: 'pointer' }}>{lang === 'th' ? 'รหัส' : 'Code'} {sortBy === 'product_code' && (sortAsc ? '▲' : '▼')}</th>
              <th onClick={() => handleSort('product_name')} style={{ cursor: 'pointer' }}>{lang === 'th' ? 'ชื่อ' : 'Name'} {sortBy === 'product_name' && (sortAsc ? '▲' : '▼')}</th>
              <th>{lang === 'th' ? 'แบรนด์' : 'Brand'}</th>
              <th>{lang === 'th' ? 'หมวดหมู่' : 'Category'}</th>
              <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>{lang === 'th' ? 'จำนวน' : 'Qty'} {sortBy === 'quantity' && (sortAsc ? '▲' : '▼')}</th>
              <th>{lang === 'th' ? 'หน่วย' : 'Unit'}</th>
              <th>{lang === 'th' ? 'หมายเหตุ' : 'Notes'}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map(p => (
              <tr key={p.id}>
                <td className="code">{p.product_code}</td>
                <td>{p.product_name}</td>
                <td>{p.brand}</td>
                <td>{p.category}</td>
                <td style={{ textAlign: 'center' }}>{p.quantity}</td>
                <td>{p.unit}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.notes || '-'}</td>
                <td className="actions">
                  <button className="btn-icon" onClick={() => openEditModal(p)}><Edit2 size={16} /></button>
                  <button className="btn-icon danger" onClick={() => deleteProduct(p.id, p.product_code)}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedProducts.length === 0 && !loading && <div className="empty-state">{t('noData')}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'แก้ไข' : 'เพิ่ม'} size="md">
        <div className="form-group"><label>รหัสสินค้า *</label><input type="text" value={formData.product_code || ''} onChange={(e) => setFormData({ ...formData, product_code: e.target.value })} placeholder="CODE-001" /></div>
        <div className="form-group"><label>ชื่อสินค้า *</label><input type="text" value={formData.product_name || ''} onChange={(e) => setFormData({ ...formData, product_name: e.target.value })} /></div>
        <div className="form-row">
          <div className="form-group"><label>แบรนด์</label><input type="text" value={formData.brand || ''} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} /></div>
          <div className="form-group"><label>หมวดหมู่</label><input type="text" value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>จำนวน *</label><input type="number" value={formData.quantity || 0} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })} /></div>
          <div className="form-group"><label>หน่วย</label><input type="text" value={formData.unit || ''} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} /></div>
        </div>
        <div className="form-group"><label>หมายเหตุ</label><textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="2" /></div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('cancel')}</button>
          <button className="btn btn-primary" onClick={saveProduct}>{t('save')}</button>
        </div>
      </Modal>
    </div>
  )
}
