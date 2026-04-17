import { useMemo } from 'react'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i)
  }

  const pages: (number | 'ellipsis')[] = [0]

  if (current > 2) {
    pages.push('ellipsis')
  }

  const start = Math.max(1, current - 1)
  const end = Math.min(total - 2, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 3) {
    pages.push('ellipsis')
  }

  pages.push(total - 1)

  return pages
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages])

  if (totalPages <= 1) return null

  return (
    <nav aria-label="Page navigation">
      <ul className="pagination justify-content-center">
        <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            aria-label="Previous page"
          >
            Previous
          </button>
        </li>
        {pageNumbers.map((item, idx) =>
          item === 'ellipsis' ? (
            <li key={`ellipsis-${idx}`} className="page-item disabled">
              <span className="page-link">&hellip;</span>
            </li>
          ) : (
            <li key={item} className={`page-item ${page === item ? 'active' : ''}`}>
              <button
                className="page-link"
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item + 1}`}
                aria-current={page === item ? 'page' : undefined}
              >
                {item + 1}
              </button>
            </li>
          ),
        )}
        <li className={`page-item ${page === totalPages - 1 ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages - 1}
            aria-label="Next page"
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Pagination
