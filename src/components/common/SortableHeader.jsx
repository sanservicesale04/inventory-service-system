import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export default function SortableHeader({ label, sortKeyName, currentKey, currentDir, onSort }) {
  const isActive = currentKey === sortKeyName

  return (
    <th
      onClick={() => onSort(sortKeyName)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      className="sortable-th"
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {isActive ? (
          currentDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
        ) : (
          <ChevronsUpDown size={14} style={{ opacity: 0.35 }} />
        )}
      </span>
    </th>
  )
}
