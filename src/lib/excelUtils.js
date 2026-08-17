import * as XLSX from 'xlsx'

/**
 * Export array of objects to an Excel file and trigger browser download
 * @param {Array<Object>} data - rows to export
 * @param {string} filename - e.g. 'products_2026-06-18'
 * @param {string} sheetName
 */
export function exportToExcel(data, filename, sheetName = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Read an uploaded Excel/CSV file and return parsed rows as array of objects
 * @param {File} file
 * @returns {Promise<Array<Object>>}
 */
export function importFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = (err) => reject(err)
    reader.readAsArrayBuffer(file)
  })
}
