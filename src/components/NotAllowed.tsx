import { Link } from 'react-router-dom'

function NotAllowed() {
  return (
    <div className="text-center py-5" role="alert">
      <h1 className="h3 mb-3">Not allowed</h1>
      <p className="text-muted mb-4">Your role does not have access to this page.</p>
      <Link className="btn btn-primary" to="/">
        Back to dashboard
      </Link>
    </div>
  )
}

export default NotAllowed
