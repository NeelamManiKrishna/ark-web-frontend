import type { ApiErrorBody } from '../types/auth.ts'

export class ApiError extends Error {
  status: number
  code?: string
  fieldErrors: { field: string; message: string }[]

  constructor(
    message: string,
    status: number,
    code?: string,
    fieldErrors: { field: string; message: string }[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input and try again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred. The record may have been modified by another user.',
  422: 'The submitted data is invalid. Please review and correct it.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'An unexpected server error occurred. Please try again later.',
  502: 'The server is temporarily unavailable. Please try again later.',
  503: 'The service is currently unavailable. Please try again later.',
}

// Friendly text per contract error code (A2).
const CODE_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  TOKEN_REVOKED: 'Your session was ended. Please sign in again.',
  ACCOUNT_LOCKED: 'This account is locked. Contact your administrator.',
  ORG_SUSPENDED: 'This organization is suspended. Contact your administrator.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
}

// Codes whose server message is already user-facing text.
const SERVER_MESSAGE_CODES = new Set(['VALIDATION_FAILED', 'BAD_REQUEST', 'DUPLICATE', 'CONFLICT'])

/** Build an ApiError from a failed response status and its (possibly empty) JSON body. */
export function toApiError(status: number, body: ApiErrorBody | null): ApiError {
  const code = body?.error
  const serverMessage = body?.message?.trim() || ''
  const fieldErrors = body?.fieldErrors ?? []

  let message: string
  const serverTextOk =
    (code && SERVER_MESSAGE_CODES.has(code)) || status === 400 || status === 409 || status === 422
  if (serverMessage && serverTextOk) {
    message = serverMessage
  } else if (code && CODE_MESSAGES[code]) {
    message = CODE_MESSAGES[code]
  } else {
    message = STATUS_MESSAGES[status] || 'Something went wrong. Please try again.'
  }
  return new ApiError(message, status, code, fieldErrors)
}

/** Map an ApiError's fieldErrors to {field: message} for forms. */
export function fieldErrorMap(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {}
  return Object.fromEntries(err.fieldErrors.map((f) => [f.field, f.message]))
}
