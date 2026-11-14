interface FromLocation {
  pathname: string
  search?: string
  hash?: string
}

/** Where to go after sign-in: the page the user was on when the session ended, else the dashboard. */
export function getRedirectTarget(state: unknown): string {
  const from = (state as { from?: FromLocation } | null)?.from
  if (!from || typeof from.pathname !== 'string' || !from.pathname.startsWith('/') || from.pathname.startsWith('//')) {
    return '/'
  }
  if (from.pathname === '/login') return '/'
  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
}
