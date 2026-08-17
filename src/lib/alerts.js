import Swal from 'sweetalert2'

const baseConfig = {
  confirmButtonColor: '#7A1F2B',
  cancelButtonColor: '#6B7280',
  customClass: {
    popup: 'swal-custom-popup',
  },
}

export function confirmDialog({ title, text, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', icon = 'warning' }) {
  return Swal.fire({
    ...baseConfig,
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
  })
}

export function confirmDownload({ title, text, fileLabel }) {
  return Swal.fire({
    ...baseConfig,
    title: title || 'ยืนยันการดาวน์โหลด',
    text: text || `ต้องการดาวน์โหลดไฟล์ ${fileLabel || ''} หรือไม่?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ดาวน์โหลด',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true,
  })
}

export function successToast(message) {
  return Swal.fire({
    ...baseConfig,
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: message,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  })
}

export function errorToast(message) {
  return Swal.fire({
    ...baseConfig,
    toast: true,
    position: 'top-end',
    icon: 'error',
    title: message,
    showConfirmButton: false,
    timer: 2800,
    timerProgressBar: true,
  })
}

export function errorDialog(message) {
  return Swal.fire({
    ...baseConfig,
    icon: 'error',
    title: 'เกิดข้อผิดพลาด',
    text: message,
    confirmButtonText: 'ตกลง',
  })
}
