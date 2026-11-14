import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.ts'
import { changePassword } from '../api/accountApi.ts'
import { fieldErrorMap } from '../auth/apiError.ts'

const MIN_PASSWORD_LENGTH = 8

function Profile() {
  const { user, scope, logoutAll } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const next: Record<string, string> = {}
    if (!currentPassword) next.currentPassword = 'Current password is required'
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      next.newPassword = `New password must be at least ${MIN_PASSWORD_LENGTH} characters`
    }
    if (confirmPassword !== newPassword) next.confirmPassword = 'Passwords do not match'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage({ type: 'success', text: 'Password changed. Your other sessions were signed out.' })
    } catch (err) {
      setErrors(fieldErrorMap(err))
      setMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Could not change password.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogoutAll = async () => {
    await logoutAll()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div className="page-container">
      <div className="mb-4">
        <h1 className="page-title">My Profile</h1>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card">
            <div className="card-body">
              <h2 className="h5 mb-3">Account</h2>
              <dl className="row mb-0">
                <dt className="col-sm-4">Name</dt>
                <dd className="col-sm-8">{user.fullName}</dd>
                <dt className="col-sm-4">Email</dt>
                <dd className="col-sm-8">{user.email}</dd>
                <dt className="col-sm-4">Role</dt>
                <dd className="col-sm-8">{user.role.replace(/_/g, ' ')}</dd>
                <dt className="col-sm-4">Access</dt>
                <dd className="col-sm-8">
                  {!scope
                    ? 'Loading…'
                    : scope.role === 'SUPER_ADMIN'
                      ? 'All organizations'
                      : scope.branchIds.length > 0
                        ? `Own organization, ${scope.branchIds.length} branch${scope.branchIds.length > 1 ? 'es' : ''}`
                        : 'Own organization'}
                </dd>
              </dl>
            </div>
          </div>

          <div className="card mt-4">
            <div className="card-body">
              <h2 className="h5 mb-2">Sessions</h2>
              <p className="text-muted small">Sign out of this device and every other device you are signed in on.</p>
              <button type="button" className="btn btn-outline-danger" onClick={handleLogoutAll}>
                Sign out everywhere
              </button>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card">
            <div className="card-body">
              <h2 className="h5 mb-3">Change password</h2>

              {message && (
                <div className={`alert alert-${message.type} py-2`} role={message.type === 'danger' ? 'alert' : 'status'}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} noValidate>
                <div className="mb-3">
                  <label className="form-label" htmlFor="current-password">Current password</label>
                  <input
                    id="current-password"
                    className={`form-control${errors.currentPassword ? ' is-invalid' : ''}`}
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    aria-describedby={errors.currentPassword ? 'current-password-error' : undefined}
                  />
                  {errors.currentPassword && (
                    <div id="current-password-error" className="invalid-feedback">{errors.currentPassword}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="new-password">New password</label>
                  <input
                    id="new-password"
                    className={`form-control${errors.newPassword ? ' is-invalid' : ''}`}
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    aria-describedby={errors.newPassword ? 'new-password-error' : undefined}
                  />
                  {errors.newPassword && (
                    <div id="new-password-error" className="invalid-feedback">{errors.newPassword}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="confirm-password">Confirm new password</label>
                  <input
                    id="confirm-password"
                    className={`form-control${errors.confirmPassword ? ' is-invalid' : ''}`}
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                  />
                  {errors.confirmPassword && (
                    <div id="confirm-password-error" className="invalid-feedback">{errors.confirmPassword}</div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Change password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
