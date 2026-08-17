-- =====================================================================
-- DATABASE MIGRATION: Support pending_approval status for Technician job requests
-- Run this in Supabase SQL Editor after the main schema
-- =====================================================================

-- Update the status check constraint to include 'pending_approval'
alter table public.service_jobs
drop constraint service_jobs_status_check;

alter table public.service_jobs
add constraint service_jobs_status_check 
check (status in ('pending_approval', 'scheduled', 'in_progress', 'completed', 'cancelled'));

-- Add a field to track who requested the job (useful for technician requests)
alter table public.service_jobs
add column if not exists requested_by uuid references public.profiles(id),
add column if not exists request_notes text;

-- Optional: Add a view for easier filtering of pending jobs
create or replace view pending_job_approvals as
select 
  id, job_no, job_type, customer_company, project_name,
  appointment_date, requested_by, created_at
from public.service_jobs
where status = 'pending_approval'
order by created_at desc;

-- Ensure RLS allows technicians to view their own pending requests
-- (already covered by existing policies but good to note)
