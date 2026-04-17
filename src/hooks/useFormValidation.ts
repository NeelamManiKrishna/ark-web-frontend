import { useState, useCallback, useRef, useEffect } from 'react'
import type { ValidationSchema, FormErrors } from '../utils/validators.ts'
import { createFormValidator, validateField } from '../utils/validators.ts'

export function useFormValidation<T>(schema: ValidationSchema<T>) {
  const [errors, setErrors] = useState<FormErrors<T>>({})
  const [touched, setTouched] = useState<Set<keyof T>>(new Set())
  const touchedRef = useRef(touched)
  useEffect(() => {
    touchedRef.current = touched
  }, [touched])

  const validateAll = useCallback(
    (values: T): FormErrors<T> => {
      const allFields = new Set(Object.keys(schema) as (keyof T)[])
      setTouched(allFields)
      const result = createFormValidator(schema)(values)
      setErrors(result)
      return result
    },
    [schema],
  )

  const touchAndValidateField = useCallback(
    (field: keyof T, value: string) => {
      setTouched((prev) => {
        const next = new Set(prev)
        next.add(field)
        return next
      })
      const error = validateField(schema, field, value)
      setErrors((prev) => {
        const next = { ...prev }
        if (error) {
          next[field] = error
        } else {
          delete next[field]
        }
        return next
      })
    },
    [schema],
  )

  const revalidateField = useCallback(
    (field: keyof T, value: string) => {
      if (!touchedRef.current.has(field)) return
      const error = validateField(schema, field, value)
      setErrors((prev) => {
        const next = { ...prev }
        if (error) {
          next[field] = error
        } else {
          delete next[field]
        }
        return next
      })
    },
    [schema],
  )

  const reset = useCallback(() => {
    setErrors({})
    setTouched(new Set())
  }, [])

  const fieldClass = useCallback(
    (field: keyof T, baseClass = 'form-control') => {
      if (!touched.has(field)) return baseClass
      return `${baseClass} ${errors[field] ? 'is-invalid' : 'is-valid'}`
    },
    [touched, errors],
  )

  const isValid = Object.keys(errors).length === 0

  return {
    errors,
    touched,
    isValid,
    validateAll,
    touchAndValidateField,
    revalidateField,
    fieldClass,
    reset,
  }
}
