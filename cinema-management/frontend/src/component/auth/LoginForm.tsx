import { Lock, LogIn, Mail } from 'lucide-react'
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
    <form className="au-card" onSubmit={handleSubmit} noValidate>
      <div className="au-card-head">
        <span className="au-step"><LogIn size={15} /></span>
        <div>
          <h2>Đăng nhập</h2>
          <p>Chào mừng bạn quay lại Premiere Cinemas.</p>
        </div>
      </div>

      <FormInput
        id="login-email"
        label="Email"
        icon={<Mail size={15} />}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="ban@email.com"
        autoComplete="email"
        error={fieldErrors.email}
      />

      <FormInput
        id="login-password"
        label="Mật khẩu"
        type="password"
        icon={<Lock size={15} />}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Nhập mật khẩu"
        autoComplete="current-password"
        error={fieldErrors.password}
      />

      {message && <p className="au-message" role="alert">{message}</p>}

      <button className="au-submit" type="submit" disabled={isLoading}>
        {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
      </button>

      <div className="au-switch">
        <span>Chưa có tài khoản?</span>
        <button type="button" onClick={onRegisterClick}>
          Đăng ký ngay
        </button>
      </div>
    </form>
  )
}

export default LoginForm
