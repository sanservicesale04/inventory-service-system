import { supabase } from './supabaseClient'

/**
 * บันทึกประวัติการใช้งานลงตาราง activity_logs
 * เรียกใช้ทุกครั้งที่มีการ login/logout/create/update/delete
 *
 * @param {object} params
 * @param {string} params.userId - auth user id
 * @param {string} params.username - username สำหรับ snapshot (กันกรณีลบ user ทีหลัง)
 * @param {string} params.actionType - 'login' | 'logout' | 'create' | 'update' | 'delete'
 * @param {string} params.module - ชื่อโมดูล เช่น 'products', 'service_jobs'
 * @param {string} params.description - รายละเอียดการใช้งาน/แก้ไข
 */
export async function logActivity({ userId, username, actionType, module, description }) {
  try {
    const { error } = await supabase.from('activity_logs').insert({
      user_id: userId,
      username_snapshot: username,
      action_type: actionType,
      module,
      description,
    })
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to log activity:', error.message)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to log activity:', err)
  }
}
