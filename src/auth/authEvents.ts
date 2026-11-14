// Lets non-React code (the HTTP client) tell the React auth context the session is over,
// so the router can navigate instead of a hard page reload.
const target = new EventTarget()
const SESSION_EXPIRED = 'ark:session-expired'

export function emitSessionExpired(message = 'Your session has expired. Please sign in again.') {
  target.dispatchEvent(new CustomEvent<string>(SESSION_EXPIRED, { detail: message }))
}

export function onSessionExpired(handler: (message: string) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail)
  target.addEventListener(SESSION_EXPIRED, listener)
  return () => target.removeEventListener(SESSION_EXPIRED, listener)
}
