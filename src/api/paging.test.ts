import { describe, expect, it, vi } from 'vitest'
import { fetchAll, MAX_PAGE_SIZE } from './paging.ts'
import type { PagedResponse } from '../types/common.ts'

function pageOf(items: number[], number: number, totalPages: number, totalElements: number): PagedResponse<number> {
  return { content: items, page: { size: MAX_PAGE_SIZE, number, totalPages, totalElements } }
}

describe('fetchAll', () => {
  it('returns a single page as is', async () => {
    const load = vi.fn().mockResolvedValue(pageOf([1, 2], 0, 1, 2))
    const res = await fetchAll(load)
    expect(res.content).toEqual([1, 2])
    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith(0, MAX_PAGE_SIZE)
  })

  it('concatenates every page in order', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(pageOf([1, 2], 0, 3, 5))
      .mockResolvedValueOnce(pageOf([3, 4], 1, 3, 5))
      .mockResolvedValueOnce(pageOf([5], 2, 3, 5))
    const res = await fetchAll(load)
    expect(res.content).toEqual([1, 2, 3, 4, 5])
    expect(res.page.totalElements).toBe(5)
    expect(res.page.totalPages).toBe(1)
    expect(load).toHaveBeenNthCalledWith(3, 2, MAX_PAGE_SIZE)
  })

  it('propagates a failure from a later page', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(pageOf([1], 0, 2, 2))
      .mockRejectedValueOnce(new Error('boom'))
    await expect(fetchAll(load)).rejects.toThrow('boom')
  })
})
