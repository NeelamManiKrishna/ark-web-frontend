interface SortableHeaderProps {
  label: string
  field: string
  currentSort: string // e.g. "firstName,asc"
  onSort: (sort: string) => void
}

function SortableHeader({ label, field, currentSort, onSort }: SortableHeaderProps) {
  const [currentField, currentDir] = currentSort.split(',')
  const isActive = currentField === field
  const nextDir = isActive && currentDir === 'asc' ? 'desc' : 'asc'

  return (
    <th
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      onClick={() => onSort(`${field},${nextDir}`)}
    >
      {label}
      {' '}
      <span className={isActive ? 'text-primary' : 'text-muted opacity-25'}>
        {isActive && currentDir === 'desc' ? '▼' : '▲'}
      </span>
    </th>
  )
}

export default SortableHeader
