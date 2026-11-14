import Modal from './Modal.tsx'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  detail?: string
  confirmLabel?: string
  loading?: boolean
  loadingLabel?: string
}

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Delete',
  message,
  detail,
  confirmLabel = 'Delete',
  loading = false,
  loadingLabel = 'Working...',
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdrop
      title={title}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </>
      }
    >
      <p>{message}</p>
      {detail && <p className="text-danger mb-0">{detail}</p>}
    </Modal>
  )
}

export default ConfirmModal
