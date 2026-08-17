-- =====================================================================
-- INVENTORY & SERVICE MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Run this entire file in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES TABLE (extends Supabase auth.users with role + display info)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user', 'technician')),
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.profiles is 'User profiles with role: admin, user, technician';

-- ---------------------------------------------------------------------
-- 2. PRODUCTS TABLE (รายการสินค้า / Product & Pricelist)
-- ---------------------------------------------------------------------
create table public.products (
  id uuid default gen_random_uuid() primary key,
  product_code text unique not null,        -- รหัส code สินค้า
  product_name text not null,
  brand text,                                 -- ยี่ห้อสินค้า
  category text,                              -- หมวดหมู่สินค้า
  unit text default 'pcs',                    -- หน่วยนับ
  price numeric(12,2) default 0,
  cost numeric(12,2) default 0,
  stock_quantity numeric(12,2) default 0,    -- คำนวณจาก transactions แต่เก็บ cache ไว้เพื่อความเร็ว
  min_stock_alert numeric(12,2) default 0,
  description text,
  is_active boolean default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_products_code on public.products(product_code);
create index idx_products_category on public.products(category);
create index idx_products_brand on public.products(brand);

-- ---------------------------------------------------------------------
-- 3. STOCK TRANSACTIONS (นำเข้า-จ่ายออก: รับเข้า / จ่ายออก / เบิก-ยืม)
-- ---------------------------------------------------------------------
create table public.stock_transactions (
  id uuid default gen_random_uuid() primary key,
  transaction_type text not null check (transaction_type in ('receive', 'issue', 'borrow', 'requisition', 'return')),
  -- receive = รับสินค้าเข้าคลัง, issue = จ่ายสินค้าออก
  -- borrow = ยืม, requisition = เบิก, return = คืน  (เบิก-ยืม-คืน ใช้ field ประเภทย่อยด้านล่าง)
  document_no text not null,                 -- เลขที่เอกสาร เช่น PO-2026-001
  transaction_date date not null default current_date,
  product_id uuid references public.products(id) not null,
  product_code_snapshot text,                -- เก็บ snapshot ของรหัสตอนทำรายการ (กันกรณีลบสินค้า)
  quantity numeric(12,2) not null,
  -- สำหรับ รับเข้า
  supplier_name text,                         -- ผู้จัดจำหน่าย
  -- สำหรับ จ่ายออก
  customer_name text,                         -- ชื่อบริษัท/ลูกค้า
  -- สำหรับ เบิก-ยืม
  borrow_type text check (borrow_type in ('borrow', 'requisition', 'return')), -- ยืม/เบิก/คืน
  contact_person text,                        -- ชื่อบริษัท/ชื่อผู้มาติดต่อ
  due_return_date date,                       -- วันที่กำหนดคืน
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_stock_tx_type on public.stock_transactions(transaction_type);
create index idx_stock_tx_date on public.stock_transactions(transaction_date);
create index idx_stock_tx_product on public.stock_transactions(product_id);
create index idx_stock_tx_doc on public.stock_transactions(document_no);

-- ---------------------------------------------------------------------
-- 4. THAI PROVINCES (สำหรับ dropdown จังหวัด - ยกเว้น 3 จังหวัดชายแดนใต้)
-- ---------------------------------------------------------------------
create table public.provinces (
  id serial primary key,
  name_th text not null,
  name_en text not null
);

-- ---------------------------------------------------------------------
-- 5. SERVICE JOBS (งานบริการ: Fire Alarm, Fire Pump, Lightning, ส่งสินค้า)
-- ---------------------------------------------------------------------
create table public.service_jobs (
  id uuid default gen_random_uuid() primary key,
  job_no text unique not null,                -- เลขที่งานบริการ เช่น BL-2026-001
  job_type text not null check (job_type in ('fire_alarm', 'fire_pump', 'lightning', 'delivery')),
  customer_company text not null,             -- ชื่อบริษัทลูกค้า
  project_name text,                          -- ชื่อโครงการ/project
  customer_name text,                         -- ชื่อลูกค้า
  contact_phone text,                         -- เบอร์ติดต่อ
  site_address text,                          -- สถานที่เข้างาน/ที่อยู่
  province text,                              -- จังหวัด (FK ความหมาย ไม่ใช่ FK จริงเพื่อความง่าย)
  appointment_date date not null,             -- วันที่นัดเข้างาน
  technician_id uuid references public.profiles(id), -- ช่างผู้รับผิดชอบ
  technician_name_snapshot text,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes text,                                 -- หมายเหตุ/ข้อเสนอแนะ/รายละเอียด
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_service_jobs_type on public.service_jobs(job_type);
create index idx_service_jobs_date on public.service_jobs(appointment_date);
create index idx_service_jobs_tech on public.service_jobs(technician_id);

-- Enforce: max 10 jobs per day per job_type (ตรวจสอบด้วย trigger)
create or replace function check_daily_job_limit()
returns trigger as $$
declare
  job_count integer;
begin
  select count(*) into job_count
  from public.service_jobs
  where job_type = NEW.job_type
    and appointment_date = NEW.appointment_date
    and id != coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if job_count >= 10 then
    raise exception 'เกินจำนวนงานสูงสุด 10 งาน/ประเภทงาน/วัน (Maximum 10 jobs per type per day exceeded)';
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_check_daily_job_limit
before insert or update on public.service_jobs
for each row execute function check_daily_job_limit();

-- ---------------------------------------------------------------------
-- 6. ACTIVITY LOGS (บันทึกประวัติการใช้งาน/ล็อกอิน)
-- ---------------------------------------------------------------------
create table public.activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  username_snapshot text,
  action_type text not null,                  -- login, logout, create, update, delete
  module text,                                 -- products, stock_transactions, service_jobs, users
  description text not null,                  -- รายละเอียดการใช้งาน/แก้ไข
  ip_address text,
  created_at timestamptz default now()
);

create index idx_activity_logs_user on public.activity_logs(user_id);
create index idx_activity_logs_date on public.activity_logs(created_at);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) — ควบคุมสิทธิ์ตาม role
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.service_jobs enable row level security;
alter table public.activity_logs enable row level security;
alter table public.provinces enable row level security;

-- Helper function: get current user's role
create or replace function public.get_my_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- PROFILES policies
create policy "Anyone logged in can view profiles" on public.profiles
  for select using (auth.uid() is not null);

create policy "Only admin can insert profiles" on public.profiles
  for insert with check (public.get_my_role() = 'admin');

create policy "Only admin can update profiles" on public.profiles
  for update using (public.get_my_role() = 'admin');

create policy "Only admin can delete profiles" on public.profiles
  for delete using (public.get_my_role() = 'admin');

-- PROVINCES policies (read-only reference data, everyone can read)
create policy "Anyone logged in can view provinces" on public.provinces
  for select using (auth.uid() is not null);

-- PRODUCTS policies
-- Technician: read-only NO access (only service jobs) -> block all product access for technician
create policy "Admin and User can view products" on public.products
  for select using (public.get_my_role() in ('admin', 'user'));

create policy "Admin and User can insert products" on public.products
  for insert with check (public.get_my_role() in ('admin', 'user'));

create policy "Only admin can update products" on public.products
  for update using (public.get_my_role() = 'admin');

create policy "Only admin can delete products" on public.products
  for delete using (public.get_my_role() = 'admin');

-- STOCK TRANSACTIONS policies (same as products: technician blocked)
create policy "Admin and User can view stock transactions" on public.stock_transactions
  for select using (public.get_my_role() in ('admin', 'user'));

create policy "Admin and User can insert stock transactions" on public.stock_transactions
  for insert with check (public.get_my_role() in ('admin', 'user'));

create policy "Admin and User can update stock transactions" on public.stock_transactions
  for update using (public.get_my_role() in ('admin', 'user'));

create policy "Only admin can delete stock transactions" on public.stock_transactions
  for delete using (public.get_my_role() = 'admin');

-- SERVICE JOBS policies (admin, user, technician can all view/edit per spec)
create policy "All roles can view service jobs" on public.service_jobs
  for select using (auth.uid() is not null);

create policy "All roles can insert service jobs" on public.service_jobs
  for insert with check (auth.uid() is not null);

create policy "All roles can update service jobs" on public.service_jobs
  for update using (auth.uid() is not null);

create policy "Only admin can delete service jobs" on public.service_jobs
  for delete using (public.get_my_role() = 'admin');

-- ACTIVITY LOGS policies (everyone can insert their own log, admin can view all, user can view own)
create policy "Anyone logged in can insert their own log" on public.activity_logs
  for insert with check (auth.uid() = user_id);

create policy "Admin can view all logs, others view own" on public.activity_logs
  for select using (public.get_my_role() = 'admin' or user_id = auth.uid());

-- =====================================================================
-- SEED DATA: Thai Provinces (excluding 3 southern border provinces per spec)
-- =====================================================================
insert into public.provinces (name_th, name_en) values
('กรุงเทพมหานคร', 'Bangkok'),
('กระบี่', 'Krabi'),
('กาญจนบุรี', 'Kanchanaburi'),
('กาฬสินธุ์', 'Kalasin'),
('กำแพงเพชร', 'Kamphaeng Phet'),
('ขอนแก่น', 'Khon Kaen'),
('จันทบุรี', 'Chanthaburi'),
('ฉะเชิงเทรา', 'Chachoengsao'),
('ชลบุรี', 'Chonburi'),
('ชัยนาท', 'Chai Nat'),
('ชัยภูมิ', 'Chaiyaphum'),
('ชุมพร', 'Chumphon'),
('เชียงราย', 'Chiang Rai'),
('เชียงใหม่', 'Chiang Mai'),
('ตรัง', 'Trang'),
('ตราด', 'Trat'),
('ตาก', 'Tak'),
('นครนายก', 'Nakhon Nayok'),
('นครปฐม', 'Nakhon Pathom'),
('นครพนม', 'Nakhon Phanom'),
('นครราชสีมา', 'Nakhon Ratchasima'),
('นครศรีธรรมราช', 'Nakhon Si Thammarat'),
('นครสวรรค์', 'Nakhon Sawan'),
('นนทบุรี', 'Nonthaburi'),
('นราธิวาส', 'Narathiwat'),
('น่าน', 'Nan'),
('บึงกาฬ', 'Bueng Kan'),
('บุรีรัมย์', 'Buriram'),
('ปทุมธานี', 'Pathum Thani'),
('ประจวบคีรีขันธ์', 'Prachuap Khiri Khan'),
('ปราจีนบุรี', 'Prachinburi'),
('ปัตตานี', 'Pattani'),
('พระนครศรีอยุธยา', 'Phra Nakhon Si Ayutthaya'),
('พังงา', 'Phang Nga'),
('พัทลุง', 'Phatthalung'),
('พิจิตร', 'Phichit'),
('พิษณุโลก', 'Phitsanulok'),
('เพชรบุรี', 'Phetchaburi'),
('เพชรบูรณ์', 'Phetchabun'),
('แพร่', 'Phrae'),
('ภูเก็ต', 'Phuket'),
('มหาสารคาม', 'Maha Sarakham'),
('มุกดาหาร', 'Mukdahan'),
('แม่ฮ่องสอน', 'Mae Hong Son'),
('ยโสธร', 'Yasothon'),
('ยะลา', 'Yala'),
('ร้อยเอ็ด', 'Roi Et'),
('ระนอง', 'Ranong'),
('ระยอง', 'Rayong'),
('ราชบุรี', 'Ratchaburi'),
('ลพบุรี', 'Lopburi'),
('ลำปาง', 'Lampang'),
('ลำพูน', 'Lamphun'),
('เลย', 'Loei'),
('ศรีสะเกษ', 'Sisaket'),
('สกลนคร', 'Sakon Nakhon'),
('สงขลา', 'Songkhla'),
('สตูล', 'Satun'),
('สมุทรปราการ', 'Samut Prakan'),
('สมุทรสงคราม', 'Samut Songkhram'),
('สมุทรสาคร', 'Samut Sakhon'),
('สระแก้ว', 'Sa Kaeo'),
('สระบุรี', 'Saraburi'),
('สิงห์บุรี', 'Sing Buri'),
('สุโขทัย', 'Sukhothai'),
('สุพรรณบุรี', 'Suphan Buri'),
('สุราษฎร์ธานี', 'Surat Thani'),
('สุรินทร์', 'Surin'),
('หนองคาย', 'Nong Khai'),
('หนองบัวลำภู', 'Nong Bua Lamphu'),
('อ่างทอง', 'Ang Thong'),
('อำนาจเจริญ', 'Amnat Charoen'),
('อุดรธานี', 'Udon Thani'),
('อุตรดิตถ์', 'Uttaradit'),
('อุทัยธานี', 'Uthai Thani'),
('อุบลราชธานี', 'Ubon Ratchathani');

-- =====================================================================
-- TRIGGER: auto-create profile when new auth user signs up
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- ENABLE REALTIME on key tables (for live multi-user sync)
-- =====================================================================
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.stock_transactions;
alter publication supabase_realtime add table public.service_jobs;
alter publication supabase_realtime add table public.activity_logs;
alter publication supabase_realtime add table public.profiles;

-- =====================================================================
-- DONE. Next step: create your first admin user via Supabase Dashboard
-- > Authentication > Users > Add User, then run:
-- update public.profiles set role = 'admin' where username = 'your_username';
-- =====================================================================
