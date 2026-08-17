import { useState, useMemo } from 'react'

/**
 * Hook สำหรับเรียงลำดับข้อมูลในตาราง โดยกดที่หัวตาราง
 * @param {Array} data - ข้อมูลดิบ
 * @param {string} defaultKey - field ที่ใช้ sort เริ่มต้น
 * @param {string} defaultDir - 'asc' | 'desc'
 */
export function useSortableData(data, defaultKey = null, defaultDir = 'asc') {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortDir, setSortDir] = useState(defaultDir)

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    const copy = [...data]
    copy.sort((a, b) => {
      let valA = a[sortKey]
      let valB = b[sortKey]

      if (valA == null) valA = ''
      if (valB == null) valB = ''

      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()

      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [data, sortKey, sortDir])

  function requestSort(key) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return { sortedData, sortKey, sortDir, requestSort }
}
