import { describe, expect, it } from 'vitest'
import { fieldErrorMap, toApiError } from './apiError.ts'

describe('toApiError', () => {
  it('uses friendly text for known codes', () => {
    const err = toApiError(401, { error: 'INVALID_CREDENTIALS', message: 'Bad credentials' })
    expect(err.message).toBe('Incorrect email or password.')
    expect(err.code).toBe('INVALID_CREDENTIALS')
  })

  it('surfaces the server message for 409 and validation errors', () => {
    expect(toApiError(409, { error: 'DUPLICATE', message: 'Email already exists' }).message).toBe('Email already exists')
    expect(toApiError(422, { message: 'Name is required' }).message).toBe('Name is required')
  })

  it('falls back to status text', () => {
    expect(toApiError(403, null).message).toBe('You do not have permission to perform this action.')
    expect(toApiError(418, null).message).toBe('Something went wrong. Please try again.')
  })

  it('keeps fieldErrors and maps them for forms', () => {
    const err = toApiError(422, {
      error: 'VALIDATION_FAILED',
      message: 'Invalid',
      fieldErrors: [{ field: 'email', message: 'Invalid email' }],
    })
    expect(fieldErrorMap(err)).toEqual({ email: 'Invalid email' })
    expect(fieldErrorMap(new Error('x'))).toEqual({})
  })
})
