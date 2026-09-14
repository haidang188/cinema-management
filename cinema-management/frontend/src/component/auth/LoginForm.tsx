import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AuthFieldErrors, LoginPayload } from '../../types/auth'
import FormInput from './FormInput'

interface LoginFormProps {
  message: string
  fieldErrors: AuthFieldErrors
  isLoading: boolean
  onSubmit: (payload: LoginPayload) => Promise<void>
  onRegisterClick: () => void
}

function LoginForm({ message, fieldErrors, isLoading, onSubmit, onRegisterClick }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void onSubmit({ email, password })
  }

  return (
    <form className="auth-card auth-card--login" onSubmit={handleSubmit} noValidate>
      <div className="auth-card__brand">
        <strong>PREMIERE</strong>
        <span>Cinemas Management</span>
      </div>

      <div className="auth-card__heading">
        <span aria-hidden="true" />
        <h2>Đăng nhập</h2>
      </div>

      <FormInput
        id="login-email"
        label="Email"
        type="text"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Nhập email"
        autoComplete="email"
        aria-invalid={Boolean(fieldErrors.email)}
        aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
      />
      {fieldErrors.email && (
        <small className="auth-field-error" id="login-email-error">
          {fieldErrors.email}
        </small>
      )}

      <FormInput
        id="login-password"
        label="Mật khẩu"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Nhập mật khẩu"
        autoComplete="current-password"
        aria-invalid={Boolean(fieldErrors.password)}
        aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
      />
      {fieldErrors.password && (
        <small className="auth-field-error" id="login-password-error">
          {fieldErrors.password}
        </small>
      )}

      {message && <p className="form-message">{message}</p>}

      <button className="primary-action" type="submit" disabled={isLoading}>
        {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
      </button>

      <div className="auth-switch">
        <span>Chưa có tài khoản?</span>
        <button type="button" onClick={onRegisterClick}>
          Đăng ký ngay
        </button>
      </div>
    </form>
  )
}

export default LoginForm
