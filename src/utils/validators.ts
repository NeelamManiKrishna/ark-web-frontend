/**
 * Generic field validation utilities.
 *
 * A validator is a function that takes a string value and returns
 * an error message (string) or undefined if valid.
 *
 * Use `composeValidators` to chain multiple validators per field.
 * Use `createFormValidator` to build a full-form validate function
 * from a schema of field-to-validator mappings.
 *
 * Usage example for any page:
 *
 *   const schema: ValidationSchema<MyFormType> = {
 *     name: composeValidators(required('Name'), minLength(2), maxLength(100)),
 *     email: email(),
 *     phone: phone(),
 *     website: url(),
 *   }
 *
 *   const { errors, validateAll, ... } = useFormValidation(schema)
 */

export type FieldValidator = (value: string) => string | undefined

// --- Primitive validators (composable) ---

export function required(label: string): FieldValidator {
  return (value) => (!value.trim() ? `${label} is required` : undefined)
}

export function minLength(min: number): FieldValidator {
  return (value) =>
    value.trim() && value.trim().length < min
      ? `Must be at least ${min} characters`
      : undefined
}

export function maxLength(max: number): FieldValidator {
  return (value) =>
    value.trim() && value.trim().length > max
      ? `Must be ${max} characters or less`
      : undefined
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function email(): FieldValidator {
  return (value) =>
    value && !EMAIL_REGEX.test(value)
      ? 'Enter a valid email address'
      : undefined
}

const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/
export function phone(): FieldValidator {
  return (value) => {
    if (!value) return undefined
    if (!PHONE_REGEX.test(value)) return 'Enter a valid phone number'
    const digitCount = value.replace(/\D/g, '').length
    if (digitCount < 7) return 'Phone number must have at least 7 digits'
    if (digitCount > 15) return 'Phone number must have at most 15 digits'
    return undefined
  }
}

const URL_REGEX = /^https?:\/\/.+/
export function url(): FieldValidator {
  return (value) =>
    value && !URL_REGEX.test(value)
      ? 'Enter a valid URL (must start with http:// or https://)'
      : undefined
}

export function pattern(regex: RegExp, message: string): FieldValidator {
  return (value) =>
    value && !regex.test(value) ? message : undefined
}

// --- Composition ---

export function composeValidators(...validators: FieldValidator[]): FieldValidator {
  return (value) => {
    for (const validator of validators) {
      const error = validator(value)
      if (error) return error
    }
    return undefined
  }
}

// --- Form-level types and helpers ---

export type ValidationSchema<T> = {
  [K in keyof T]?: FieldValidator
}

export type FormErrors<T> = Partial<Record<keyof T, string>>

export function createFormValidator<T>(schema: ValidationSchema<T>) {
  return (values: T): FormErrors<T> => {
    const errors: FormErrors<T> = {}
    for (const key in schema) {
      const validator = schema[key]
      if (validator) {
        const error = validator((values[key] as string) ?? '')
        if (error) {
          errors[key] = error
        }
      }
    }
    return errors
  }
}

/**
 * Validate a single field against the schema.
 */
export function validateField<T>(
  schema: ValidationSchema<T>,
  field: keyof T,
  value: string,
): string | undefined {
  const validator = schema[field]
  return validator ? validator(value) : undefined
}
