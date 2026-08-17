-- =====================================================================
-- เพิ่มเติม: RPC function สำหรับล็อกอินด้วย username (ไม่ใช่ email)
-- รันไฟล์นี้ใน SQL Editor หลังจากรัน supabase_schema.sql แล้ว
-- =====================================================================

-- ฟังก์ชันนี้รับ username แล้ว return email ที่ผูกกับ user นั้น
-- ใช้ security definer เพื่อให้เข้าถึง auth.users ได้ (ปกติ client เข้าไม่ได้)
-- ปลอดภัย เพราะ return แค่ email ของ username ที่ระบุเท่านั้น ไม่ leak ข้อมูลอื่น
create or replace function public.get_email_by_username(lookup_username text)
returns text as $$
declare
  found_email text;
begin
  select email into found_email
  from auth.users
  where id = (select id from public.profiles where username = lookup_username limit 1);

  return found_email;
end;
$$ language plpgsql security definer;

-- อนุญาตให้ทุกคน (รวม anon ก่อน login) เรียกฟังก์ชันนี้ได้ เพราะใช้ตอนล็อกอิน
grant execute on function public.get_email_by_username(text) to anon, authenticated;
