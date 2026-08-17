-- =====================================================================
-- MIGRATION 2: เพิ่มฟีเจอร์ใหม่
-- - Technician ขอเพิ่มงาน (status pending_approval)
-- - RPC สำหรับ admin จัดการบัญชีผู้ใช้ (สร้าง user ใหม่)
-- รันไฟล์นี้ใน Supabase SQL Editor หลังจากรัน schema เดิมแล้ว
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. เพิ่ม status ใหม่ให้ service_jobs: pending_approval, rejected
-- ---------------------------------------------------------------------
alter table public.service_jobs drop constraint if exists service_jobs_status_check;
alter table public.service_jobs add constraint service_jobs_status_check
  check (status in ('pending_approval', 'scheduled', 'in_progress', 'completed', 'cancelled', 'rejected'));

-- เพิ่ม column เก็บว่าใครเป็นคนขอ (สำหรับ technician request) และใครอนุมัติ
alter table public.service_jobs add column if not exists requested_by uuid references public.profiles(id);
alter table public.service_jobs add column if not exists approved_by uuid references public.profiles(id);
alter table public.service_jobs add column if not exists approved_at timestamptz;
alter table public.service_jobs add column if not exists rejection_reason text;

-- ---------------------------------------------------------------------
-- 2. เพิ่ม job_type 'delivery' (ส่งสินค้า) - แก้ check constraint
-- ---------------------------------------------------------------------
alter table public.service_jobs drop constraint if exists service_jobs_job_type_check;
alter table public.service_jobs add constraint service_jobs_job_type_check
  check (job_type in ('fire_alarm', 'fire_pump', 'lightning', 'delivery'));

-- ---------------------------------------------------------------------
-- 3. อัปเดต RLS policy ของ service_jobs: technician สร้างได้แค่ pending_approval
-- ---------------------------------------------------------------------
drop policy if exists "All roles can insert service jobs" on public.service_jobs;
create policy "Admin/User insert any status, Technician insert pending only" on public.service_jobs
  for insert with check (
    public.get_my_role() in ('admin', 'user')
    or (public.get_my_role() = 'technician' and status = 'pending_approval')
  );

drop policy if exists "All roles can update service jobs" on public.service_jobs;
create policy "Admin/User update any, Technician update own pending" on public.service_jobs
  for update using (
    public.get_my_role() in ('admin', 'user')
    or (public.get_my_role() = 'technician' and requested_by = auth.uid() and status = 'pending_approval')
  );

-- ---------------------------------------------------------------------
-- 4. ลบ trigger จำกัด 10 งาน/วัน เดิม แล้วสร้างใหม่ให้ไม่นับ pending_approval/rejected
--    (เฉพาะงานที่ scheduled จริงๆถึงนับโควต้า)
-- ---------------------------------------------------------------------
create or replace function check_daily_job_limit()
returns trigger as $$
declare
  job_count integer;
begin
  if NEW.status in ('pending_approval', 'rejected', 'cancelled') then
    return NEW;
  end if;

  select count(*) into job_count
  from public.service_jobs
  where job_type = NEW.job_type
    and appointment_date = NEW.appointment_date
    and status not in ('pending_approval', 'rejected', 'cancelled')
    and id != coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if job_count >= 10 then
    raise exception 'เกินจำนวนงานสูงสุด 10 งาน/ประเภทงาน/วัน (Maximum 10 jobs per type per day exceeded)';
  end if;
  return NEW;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- 5. RPC: Admin สร้างผู้ใช้ใหม่ (ต้องใช้ server-side เพราะ client สร้าง
--    auth user ตรงไม่ได้ด้วย anon key - ใช้ Supabase Admin API ผ่าน
--    Edge Function จะปลอดภัยกว่า แต่เพื่อความเรียบง่ายในระยะนี้
--    ใช้วิธี sign up ปกติแล้วให้ admin set role ทีหลังผ่านหน้า UI)
-- ---------------------------------------------------------------------
-- ฟังก์ชันนี้ใช้สำหรับ "แก้ไข" role/ข้อมูลของ user ที่มีอยู่แล้วเท่านั้น
-- (การสร้าง user ใหม่ใช้ supabase.auth.signUp ฝั่ง client ตามปกติ)
create or replace function public.admin_update_user_role(
  target_user_id uuid,
  new_role text,
  new_full_name text default null,
  new_is_active boolean default null
)
returns void as $$
begin
  if public.get_my_role() != 'admin' then
    raise exception 'Only admin can update user roles';
  end if;

  update public.profiles
  set
    role = coalesce(new_role, role),
    full_name = coalesce(new_full_name, full_name),
    is_active = coalesce(new_is_active, is_active),
    updated_at = now()
  where id = target_user_id;
end;
$$ language plpgsql security definer;

grant execute on function public.admin_update_user_role(uuid, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Enable Realtime สำหรับ profiles (เผื่อยังไม่ได้เปิด)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

-- =====================================================================
-- DONE
-- =====================================================================
