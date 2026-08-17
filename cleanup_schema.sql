-- =====================================================================
-- CLEANUP SCRIPT — ลบของเก่าที่รันไปบางส่วนก่อนรัน schema ใหม่
-- รันไฟล์นี้ก่อน แล้วค่อยรัน supabase_schema.sql อีกครั้ง
-- =====================================================================

-- ลบ triggers ก่อน (ถ้ามี) - เช็คว่าตารางมีอยู่จริงก่อนลบ trigger ของมัน
drop trigger if exists on_auth_user_created on auth.users;

do $$
begin
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'service_jobs') then
    execute 'drop trigger if exists trg_check_daily_job_limit on public.service_jobs';
  end if;
end $$;

-- ลบ functions
drop function if exists public.handle_new_user();
drop function if exists check_daily_job_limit();
drop function if exists public.get_my_role();

-- ลบตารางทั้งหมด (เรียงลำดับตาม dependency เพื่อไม่ให้ error เรื่อง foreign key)
drop table if exists public.activity_logs cascade;
drop table if exists public.service_jobs cascade;
drop table if exists public.stock_transactions cascade;
drop table if exists public.products cascade;
drop table if exists public.provinces cascade;
drop table if exists public.profiles cascade;

-- เสร็จแล้ว ตอนนี้ database สะอาด พร้อมรัน supabase_schema.sql ใหม่ได้เลย
