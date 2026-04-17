interface EmptyStateProps {
  message?: string
}

function EmptyState({ message = 'No records found.' }: EmptyStateProps) {
  return (
    <div className="text-center py-5 text-muted">
      <p>{message}</p>
    </div>
  )
}

export default EmptyState
