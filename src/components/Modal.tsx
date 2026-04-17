import { useRef, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useModalEscape } from '../hooks/useModalEscape.ts'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  useModalEscape(isOpen, onClose)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Save previous focus and focus the dialog on open
  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current = document.activeElement as HTMLElement | null

    // Focus the first focusable element inside the dialog
    const timer = setTimeout(() => {
      const dialog = dialogRef.current
      if (!dialog) return
      const first = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      if (first) {
        first.focus()
      } else {
        dialog.focus()
      }
    }, 0)

    return () => {
      clearTimeout(timer)
      // Restore focus when closing
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const dialog = dialogRef.current
    if (!dialog) return

    const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="modal-backdrop-custom"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={handleKeyDown}
    >
      <div
        className="modal-dialog-custom"
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="modal-header-custom">
          <h5>{title}</h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
        </div>
        <div className="modal-body-custom">
          {children}
        </div>
        {footer && (
          <div className="modal-footer-custom">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
