-- =====================================================================
-- PHASE 2 SCHEMA ADDITIONS
-- รันไฟล์นี้ใน SQL Editor หลังจากรัน supabase_schema.sql และ
-- supabase_username_login.sql แล้ว
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. เพิ่มสถานะ 'pending_approval' ให้ service_jobs
--    (สำหรับงานที่ Technician ขอเพิ่ม รอ Admin อนุมัติ)
-- ---------------------------------------------------------------------
alter table public.service_jobs drop constraint if exists service_jobs_status_check;
alter table public.service_jobs add constraint service_jobs_status_check
  check (status in ('pending_approval', 'scheduled', 'in_progress', 'completed', 'cancelled'));

-- เพิ่มคอลัมน์ติดตามการอนุมัติ
alter table public.service_jobs add column if not exists requested_by uuid references public.profiles(id);
alter table public.service_jobs add column if not exists approved_by uuid references public.profiles(id);
alter table public.service_jobs add column if not exists approved_at timestamptz;

-- ---------------------------------------------------------------------
-- 2. ปรับ trigger จำกัด 10 งาน/วัน/ประเภท ให้ไม่นับงานที่ถูกยกเลิกหรือรออนุมัติ
--    (เฉพาะงานที่ scheduled/in_progress/completed ถึงจะนับว่าเต็มโควต้า)
-- ---------------------------------------------------------------------
create or replace function check_daily_job_limit()
returns trigger as $$
declare
  job_count integer;
begin
  if NEW.status in ('scheduled', 'in_progress', 'completed') then
    select count(*) into job_count
    from public.service_jobs
    where job_type = NEW.job_type
      and appointment_date = NEW.appointment_date
      and status in ('scheduled', 'in_progress', 'completed')
      and id != coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if job_count >= 10 then
      raise exception 'เกินจำนวนงานสูงสุด 10 งาน/ประเภทงาน/วัน (Maximum 10 jobs per type per day exceeded)';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- 3. เพิ่ม 'delivery' (ส่งสินค้า) เป็นประเภทงานบริการที่รองรับ
-- ---------------------------------------------------------------------
alter table public.service_jobs drop constraint if exists service_jobs_job_type_check;
alter table public.service_jobs add constraint service_jobs_job_type_check
  check (job_type in ('fire_alarm', 'fire_pump', 'lightning', 'delivery'));

-- ---------------------------------------------------------------------
-- 4. Trigger: ปรับ stock_quantity ของ products อัตโนมัติ ตาม transaction_type
--    receive = รับเข้า (+) | issue/borrow/requisition = จ่ายออก/เบิก-ยืม (-) | return = คืน (+)
-- ---------------------------------------------------------------------
create or replace function adjust_product_stock()
returns trigger as $$
declare
  delta numeric(12,2);
begin
  -- คำนวณผลกระทบของแถวเดิม (ถ้าเป็น update/delete) แล้วคืนค่าก่อน
  if (TG_OP = 'UPDATE' or TG_OP = 'DELETE') then
    delta := case OLD.transaction_type
      when 'receive' then -OLD.quantity
      when 'return' then -OLD.quantity
      when 'issue' then OLD.quantity
      when 'borrow' then OLD.quantity
      when 'requisition' then OLD.quantity
      else 0
    end;
    update public.products set stock_quantity = stock_quantity + delta where id = OLD.product_id;
  end if;

  -- คำนวณผลกระทบของแถวใหม่ (ถ้าเป็น insert/update)
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    delta := case NEW.transaction_type
      when 'receive' then NEW.quantity
      when 'return' then NEW.quantity
      when 'issue' then -NEW.quantity
      when 'borrow' then -NEW.quantity
      when 'requisition' then -NEW.quantity
      else 0
    end;
    update public.products set stock_quantity = stock_quantity + delta where id = NEW.product_id;
  end if;

  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_adjust_product_stock on public.stock_transactions;
create trigger trg_adjust_product_stock
after insert or update or delete on public.stock_transactions
for each row execute function adjust_product_stock();

-- ---------------------------------------------------------------------
-- 5. RPC function: ให้ admin ดึงรายชื่อช่าง (technician) สำหรับ dropdown
--    (ใช้ select ปกติผ่าน profiles ได้อยู่แล้วเพราะมี RLS select เปิดให้ทุกคน
--     ที่ login แล้ว เห็น profiles ทั้งหมด — ไม่ต้องเพิ่ม RPC)
-- ---------------------------------------------------------------------
-- (ไม่ต้องเพิ่มอะไร เพราะ policy เดิมรองรับอยู่แล้ว)

-- =====================================================================
-- DONE. ตรวจสอบว่า products.stock_quantity จะอัปเดตอัตโนมัติทุกครั้งที่มี
-- การเพิ่ม/แก้ไข/ลบ stock_transactions
-- =====================================================================
