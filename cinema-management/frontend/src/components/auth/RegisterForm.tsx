import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AccountType, RegisterPayload } from '../../types/auth'
import FormInput from './FormInput'

interface RegisterFormProps {
  message: string
  isLoading: boolean
  onSubmit: (payload: RegisterPayload) => Promise<void>
  onLoginClick: () => void
}

function RegisterForm({ message, isLoading, onSubmit, onLoginClick }: RegisterFormProps) {
  const [accountType, setAccountType] = useState<AccountType>('MEMBER')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void onSubmit({ fullName, email, phone, password, confirmPassword, accountType })
  }

  return (
    <form className="auth-card auth-card--register" onSubmit={handleSubmit}>
      <div className="register-heading">
        <h2>Đăng ký tài khoản</h2>
        <p>Vui lòng điền thông tin để tham gia hệ thống.</p>
      </div>

      <div className="account-tabs" role="tablist" aria-label="Loại tài khoản">
        <button
          type="button"
          className={accountType === 'MEMBER' ? 'is-active' : ''}
          onClick={() => setAccountType('MEMBER')}
        >
          Khách hàng
        </button>
        <button
          type="button"
          className={accountType === 'EMPLOYEE' ? 'is-active' : ''}
          onClick={() => setAccountType('EMPLOYEE')}
        >
          Nhân viên
        </button>
      </div>

      <FormInput
        id="register-name"
        label="Họ và tên"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        placeholder="Nhập họ và tên"
        autoComplete="name"
        required
      />
      <FormInput
        id="register-email"
        label="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Nhập email"
        autoComplete="email"
        required
      />
      <FormInput
        id="register-phone"
        label="Số điện thoại"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="Nhập số điện thoại"
        autoComplete="tel"
        required
      />
      <FormInput
        id="register-password"
        label="Mật khẩu"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Tối thiểu 6 ký tự"
        autoComplete="new-password"
        required
      />
      <FormInput
        id="register-confirm-password"
        label="Xác nhận mật khẩu"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        placeholder="Nhập lại mật khẩu"
        autoComplete="new-password"
        required
      />

      {message && <p className="form-message">{message}</p>}

      <button className="primary-action" type="submit" disabled={isLoading}>
        {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
      </button>

      <div className="auth-switch">
        <span>Đã có tài khoản?</span>
        <button type="button" onClick={onLoginClick}>
          Đăng nhập
        </button>
      </div>
    </form>
  )
}

export default RegisterForm
