import type { PagedResponse } from '../types/common.ts'

// The backend caps page size at 100, so asking for 200 or 1000 rows silently returns 100.
export const MAX_PAGE_SIZE = 100
const MAX_PAGES = 50 // safety stop: 5,000 rows

/**
 * Load every page of a paged endpoint and return them as one PagedResponse.
 * Use it for dropdowns and class-sized lists, not for browsing large tables (those paginate).
 */
export async function fetchAll<T>(
  load: (page: number, size: number) => Promise<PagedResponse<T>>,
): Promise<PagedResponse<T>> {
  const first = await load(0, MAX_PAGE_SIZE)
  const content = [...first.content]
  const totalPages = Math.min(first.page.totalPages, MAX_PAGES)

  for (let page = 1; page < totalPages; page++) {
    const next = await load(page, MAX_PAGE_SIZE)
    content.push(...next.content)
  }

  return {
    content,
    page: { size: content.length, number: 0, totalElements: first.page.totalElements, totalPages: 1 },
  }
}
