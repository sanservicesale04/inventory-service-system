# ระบบจัดการสินค้าและงานบริการ (Inventory & Service Management System)

## โครงสร้างโปรเจกต์ (เริ่มต้น — Phase 1)

ตอนนี้ระบบมีส่วนหลักดังนี้:
- **Login** เชื่อมต่อ Supabase Auth จริง (รองรับ login ด้วย username หรือ email)
- **Dashboard** แสดงการ์ดสรุปข้อมูล (ดับเบิ้ลคลิกเพื่อไปยังเมนูนั้น) + กิจกรรมล่าสุด + งานบริการที่ใกล้ถึง — อัปเดตแบบ real-time
- **Sidebar** แถบเมนูครบทุกหัวข้อตามสเปก พับเข้า/เปิดออกได้ และซ่อนเมนูตาม role (Technician เห็นเฉพาะงานบริการ)
- **ระบบ 2 ภาษา** (TH/EN) สลับได้ทันที
- หน้าอื่นๆ (รายการสินค้า, นำเข้า-จ่ายออก, งานบริการ, จัดการบัญชี) เป็น placeholder รอพัฒนาในขั้นต่อไป

## วิธีรันบนเครื่องตัวเอง (Local Development)

### ข้อกำหนดเบื้องต้น
ต้องมี **Node.js** เวอร์ชัน 18 หรือใหม่กว่า ติดตั้งในเครื่อง (ดาวน์โหลดได้ที่ https://nodejs.org)

### ขั้นตอน
```bash
# 1. แตกไฟล์ zip ที่ได้รับ แล้วเข้าไปที่โฟลเดอร์โปรเจกต์
cd inventory-service-system

# 2. ติดตั้ง dependencies
npm install

# 3. สร้างไฟล์ .env จาก .env.example (ค่า Supabase ใส่ไว้ให้แล้ว)
cp .env.example .env

# 4. รันโปรเจกต์
npm run dev
```
จากนั้นเปิดเบราว์เซอร์ไปที่ `http://localhost:5173` แล้วล็อกอินด้วย username/password ที่สร้างไว้ใน Supabase

## วิธี Deploy ขึ้น Vercel (ให้พนักงานเข้าผ่านลิงก์จริง)

1. สร้างบัญชี GitHub (ถ้ายังไม่มี) แล้วสร้าง repository ใหม่ อัปโหลดโค้ดทั้งโฟลเดอร์นี้ขึ้นไป
2. ไปที่ https://vercel.com → สมัครด้วย GitHub
3. กด **Add New Project** → เลือก repository ที่อัปโหลดไว้
4. ในขั้นตอน **Environment Variables** ใส่ 2 ตัวแปรนี้ (ค่าเดียวกับใน `.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. กด **Deploy** รอประมาณ 1-2 นาที จะได้ลิงก์เว็บไซต์จริง เช่น `https://your-project.vercel.app`
6. ส่งลิงก์นี้ให้พนักงานเข้าใช้งานได้ทันที (ทุกคนเห็นข้อมูล real-time ตรงกัน เพราะเชื่อม database เดียวกัน)

## ไฟล์ SQL ที่ต้องรันใน Supabase
หากยังไม่ได้รัน ให้รันตามลำดับนี้ใน Supabase SQL Editor:
1. `supabase_schema.sql` — สร้างตารางทั้งหมด
2. `supabase_username_login.sql` — เพิ่มฟังก์ชันสำหรับล็อกอินด้วย username

## การสร้าง Admin คนแรก
1. Supabase Dashboard → Authentication → Users → Add User
2. รัน SQL: `update public.profiles set role = 'admin' where username = 'ชื่อที่ตั้งไว้';`

## ขั้นตอนต่อไป (ยังไม่ได้สร้าง)
- หน้ารายการสินค้า (Product & Pricelist) พร้อม sort + floating edit modal
- หน้านำเข้า-จ่ายออก (รับเข้า/จ่ายออก/เบิก-ยืม) พร้อม dropdown และปุ่ม [+] เพิ่มรายการ
- หน้างานบริการทั้งหมด + เพิ่มงานบริการ + ปฏิทิน 4 ประเภท (Fire Alarm, Fire Pump, Lightning, ส่งสินค้า)
- หน้าจัดการบัญชีผู้ใช้งาน
- หน้าประวัติการใช้งาน (Activity Logs)

แจ้ง Claude ได้เลยว่าต้องการให้สร้างเมนูไหนต่อ
