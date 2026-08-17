import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * สร้างเอกสาร PDF สำหรับใบงานบริการ (service job)
 * หมายเหตุ: jsPDF ไม่รองรับฟอนต์ไทยโดย default (จะแสดงเป็นกล่องสี่เหลี่ยม)
 * วิธีแก้ระยะยาว: ต้อง embed ฟอนต์ไทย (เช่น Sarabun) เป็น base64 ลงในโปรเจกต์
 * ในเบื้องต้นนี้ใช้ label เป็นภาษาอังกฤษเพื่อให้ PDF แสดงผลถูกต้องก่อน
 */
export function generateServiceJobPDF(job) {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Service Job Order', 14, 18)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Job No: ${job.job_no}`, 14, 28)
  doc.text(`Job Type: ${jobTypeLabelEn(job.job_type)}`, 14, 34)
  doc.text(`Status: ${job.status}`, 140, 28)
  doc.text(`Appointment Date: ${job.appointment_date}`, 140, 34)

  autoTable(doc, {
    startY: 42,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [122, 31, 43] },
    body: [
      ['Customer Company', job.customer_company || '-'],
      ['Project Name', job.project_name || '-'],
      ['Customer Name', job.customer_name || '-'],
      ['Contact Phone', job.contact_phone || '-'],
      ['Site Address', job.site_address || '-'],
      ['Province', job.province || '-'],
      ['Technician', job.technician_name_snapshot || '-'],
      ['Notes', job.notes || '-'],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
  })

  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10)

  doc.save(`${job.job_no}.pdf`)
}

function jobTypeLabelEn(type) {
  const map = {
    fire_alarm: 'Fire Alarm',
    fire_pump: 'Fire Pump',
    lightning: 'Lightning Protection',
    delivery: 'Delivery',
  }
  return map[type] || type
}

/**
 * Export ตารางข้อมูลทั่วไปเป็น PDF (ใช้สำหรับรายงานสินค้า/รายการนำเข้าจ่ายออก)
 * @param {string} title
 * @param {Array<string>} columns
 * @param {Array<Array<string>>} rows
 * @param {string} filename
 */
export function generateTablePDF(title, columns, rows, filename) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 16)

  autoTable(doc, {
    startY: 24,
    head: [columns],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [20, 38, 64] },
  })

  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10)

  doc.save(`${filename}.pdf`)
}
