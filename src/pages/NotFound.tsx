import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="text-center mt-5">
      <h1>404</h1>
      <p>Page not found.</p>
      <Link to="/" className="btn btn-primary">Go to Dashboard</Link>
    </div>
  )
}

export default NotFound
