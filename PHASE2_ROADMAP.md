# Phase 2 Development Roadmap - สร้างฟีเจอร์ทั้งหมด

เนื่องจากขนาดของระบบที่ใหญ่มาก (Products, StockTx, Services calendars, Accounts, Logs, Export/Import) 
ได้ตัดสินใจให้สร้างในส่วนแยกประจำหัวข้อเพื่อให้ง่ายต่อการตรวจสอบและแก้ไข

## Current Status
✅ Phase 1 Complete:
- Login + Dashboard + Sidebar พร้อมสลับภาษา
- Authentication, Activity logging
- Foundation utilities (alerts, Excel export/import, PDF generation)
- Modal component (พร้อมรองรับ glassmorphism)

## Phase 2 Components & Files Already Ready:
- `src/lib/alerts.js` - SweetAlert2 wrapper (พร้อมใช้)
- `src/lib/excelUtils.js` - Export/import Excel 
- `src/lib/pdfUtils.js` - PDF generation สำหรับใบงาน + ตาราง
- `src/components/common/Modal.jsx` - Floating modal (พร้อมใช้)

## Phase 2 Still Needed - BUILD ORDER (ตามลำดับความสำคัญ):

### 1. Add Modal.css styling
ไฟล์: `src/components/common/Modal.css`
- รองรับขนาด default/large
- glassmorphism effect สำหรับ job detail modal

### 2. Products Page (`src/pages/Products.jsx`)
ฟีเจอร์:
- Sortable table (กด header เพื่อ sort)
- Floating edit modal (admin only)
- Import/Export Excel
- Real-time updates

### 3. Stock Transactions Page (`src/pages/StockTransactions.jsx`)
Submenu 4 ประเภท:
- เพิ่มสินค้าใหม่
- รับสินค้าเข้าคลัง
- จ่ายสินค้าออก
- เบิก-ยืมสินค้า

ฟีเจอร์:
- Dropdown สำหรับ product code, brand, category
- ปุ่ม [+] เพิ่มรายการหลายรายการ
- Floating edit modal
- Export PDF/Excel

### 4. Services Pages (`src/pages/Services/...`)
4 หน้าย่อย:
a) AllJobs.jsx - Sortable list + edit modal
b) AddJob.jsx - Form สำหรับสร้างงาน (Technician ได้เสนอ status=pending_approval)
c-e) CalendarFireAlarm/FirePump/Lightning.jsx - Month calendars
   - Click cell เพื่อดู/แก้ไขงานในวันนั้น (glassmorphism modal)
   - Prev/Next เพื่อเปลี่ยนเดือน (2020-2050)
   - Real-time job list binding

Plus: CalendarDelivery.jsx (เหมือนกัน)

### 5. Account Management (`src/pages/AccountManagement.jsx`)
- Table ของ users (ทั้ง 3 roles)
- Add/Edit/Delete buttons (admin only)
- Role assignment dropdown
- Real-time list

### 6. Activity Logs (`src/pages/ActivityLogs.jsx`)
- Read-only table
- Filter by date range / user
- Export to Excel
- Pagination (optional)

### 7. Footer Component (`src/components/layout/Footer.jsx`)
- Simple text: "© 2026 ผู้พัฒนา นายสัตยา พันอ้น - V.1"

### 8. Update `src/App.jsx` Routes
เพิ่ม route ใหม่ทั้งหมด ให้ครบตามเมนู

## Database Migration Required FIRST
- รัน `supabase_migration_approval_workflow.sql` ใน SQL Editor เพื่อเพิ่ม pending_approval status
- Add `get_email_by_username()` RPC function (ไฟล์ `supabase_username_login.sql`)

## Translation Keys To Add (locales/th.js + locales/en.js)
เพิ่มคำต่างๆ สำหรับเมนูใหม่ทั้งหมด (รายการสินค้า, quantity, unit price, status ต่างๆ ฯลฯ)

## SweetAlert2 Usage Pattern
```javascript
import { confirmDialog, successToast, errorToast } from '../lib/alerts'

// ยืนยันก่อน delete
const result = await confirmDialog({
  title: 'ลบสินค้า?',
  text: 'เมื่อลบแล้วไม่สามารถคืนได้',
  icon: 'warning'
})
if (result.isConfirmed) { /* delete logic */ }

// แสดง success
await successToast('บันทึกสำเร็จ')
```

## Estimated Token Count
- Phase 1 (ที่ทำแล้ว): ~50k tokens
- Phase 2 (ทั้งหมด): ~40-50k tokens ต่อหากสร้างครบ

## Next Actions
1. ✅ Update package.json dependencies (เสร็จแล้ว)
2. ✅ Create database migration (เสร็จแล้ว)
3. ⏳ สร้าง Pages ทีละอัน (เริ่มจากนี่)
4. ⏳ เพิ่ม Modal.css
5. ⏳ Update App.jsx routes
6. ⏳ Responsive design check
7. ⏳ Test end-to-end

## Tips for Implementation
- ใช้ `useAuth()` เพื่อเช็ค role ว่าสามารถแก้ไขได้หรือไม่
- ใช้ `logActivity()` ทุกครั้งที่มีการ create/update/delete
- ใช้ Supabase realtime subscription เพื่อให้ data update ข้ามผู้ใช้งาน
- Export data เสมอด้วยวันที่ที่เกี่ยวข้อง
