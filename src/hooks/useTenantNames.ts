import { useEffect, useState } from 'react'
import { getOrganizationById } from '../api/organizationApi.ts'
import { getBranchById } from '../api/branchApi.ts'
import { getAcademicClassById } from '../api/academicClassApi.ts'

// Names rarely change during a session, so they are cached per id for the page lifetime.
const cache = new Map<string, string>()
const pending = new Map<string, Promise<string>>()

function cached(key: string, load: () => Promise<string>, fallback: string): Promise<string> {
  const hit = cache.get(key)
  if (hit !== undefined) return Promise.resolve(hit)
  let p = pending.get(key)
  if (!p) {
    p = load()
      .then((name) => {
        cache.set(key, name)
        return name
      })
      .catch(() => fallback) // not cached, so a later visit can retry
      .finally(() => pending.delete(key))
    pending.set(key, p)
  }
  return p
}

function useName(key: string | null, load: () => Promise<string>, fallback: string): string {
  const [state, setState] = useState<{ key: string | null; name: string }>({ key: null, name: '' })

  useEffect(() => {
    if (!key) return
    let cancelled = false
    cached(key, load, fallback).then((name) => {
      if (!cancelled) setState({ key, name })
    })
    return () => {
      cancelled = true
    }
    // load/fallback are derived from key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Ignore a name that belongs to a previous id
  return key && state.key === key ? state.name : (key ? (cache.get(key) ?? '') : '')
}

/** Display names for the organization / branch / class in the URL. Missing ids resolve to ''. */
export function useTenantNames(organizationId?: string, branchId?: string, classId?: string) {
  const orgName = useName(
    organizationId ? `org:${organizationId}` : null,
    () => getOrganizationById(organizationId!).then((o) => o.name),
    'Unknown Organization',
  )
  const branchName = useName(
    organizationId && branchId ? `branch:${organizationId}:${branchId}` : null,
    () => getBranchById(organizationId!, branchId!).then((b) => b.name),
    'Unknown Branch',
  )
  const className = useName(
    organizationId && branchId && classId ? `class:${organizationId}:${branchId}:${classId}` : null,
    () =>
      getAcademicClassById(organizationId!, branchId!, classId!).then(
        (c) => `${c.name}${c.section ? ' - ' + c.section : ''}`,
      ),
    'Unknown Class',
  )
  return { orgName, branchName, className }
}
