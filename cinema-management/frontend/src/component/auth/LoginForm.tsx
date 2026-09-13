import { useState } from 'react'
import type { FormEvent } from 'react'
import type { LoginPayload } from '../../types/auth'
import FormInput from './FormInput'

interface LoginFormProps {
  message: string
  isLoading: boolean
  onSubmit: (payload: LoginPayload) => Promise<void>
  onRegisterClick: () => void
}

function LoginForm({ message, isLoading, onSubmit, onRegisterClick }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void onSubmit({ email, password })
  }

  return (
    <form className="auth-card auth-card--login" onSubmit={handleSubmit}>
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
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Nhập email"
        autoComplete="email"
        required
      />

      <FormInput
        id="login-password"
        label="Mật khẩu"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Nhập mật khẩu"
        autoComplete="current-password"
        required
      />

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
