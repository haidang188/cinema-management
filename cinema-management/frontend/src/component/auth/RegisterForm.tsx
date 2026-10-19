import { Lock, Mail, Phone, User, UserPlus } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AuthFieldErrors, RegisterPayload } from '../../types/auth'
import FormInput from './FormInput'

interface RegisterFormProps {
  message: string
  fieldErrors: AuthFieldErrors
  isLoading: boolean
  onSubmit: (payload: RegisterPayload) => Promise<void>
  onLoginClick: () => void
}

function RegisterForm({ message, fieldErrors, isLoading, onSubmit, onLoginClick }: RegisterFormProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Web chỉ đăng ký tài khoản khách hàng; tài khoản nhân viên do quản trị tạo.
    void onSubmit({ fullName, email, phone, password, confirmPassword, accountType: 'MEMBER' })
  }

  return (
    <form className="au-card" onSubmit={handleSubmit} noValidate>
      <div className="au-card-head">
        <span className="au-step"><UserPlus size={15} /></span>
        <div>
          <h2>Đăng ký tài khoản</h2>
          <p>Tạo tài khoản thành viên để đặt vé và nhận ưu đãi.</p>
        </div>
      </div>

      <FormInput
        id="register-name"
        label="Họ và tên"
        icon={<User size={15} />}
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        placeholder="Nguyễn Văn A"
        autoComplete="name"
        error={fieldErrors.fullName}
      />

      <div className="au-row">
        <FormInput
          id="register-email"
          label="Email"
          icon={<Mail size={15} />}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ban@email.com"
          autoComplete="email"
          error={fieldErrors.email}
        />
        <FormInput
          id="register-phone"
          label="Số điện thoại"
          icon={<Phone size={15} />}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="09xx xxx xxx"
          autoComplete="tel"
          error={fieldErrors.phone}
        />
      </div>

      <div className="au-row">
        <FormInput
          id="register-password"
          label="Mật khẩu"
          type="password"
          icon={<Lock size={15} />}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Tối thiểu 6 ký tự"
          autoComplete="new-password"
          error={fieldErrors.password}
        />
        <FormInput
          id="register-confirm-password"
          label="Xác nhận mật khẩu"
          type="password"
          icon={<Lock size={15} />}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
        />
      </div>

      {message && <p className="au-message" role="alert">{message}</p>}

      <button className="au-submit" type="submit" disabled={isLoading}>
        {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
      </button>

      <div className="au-switch">
        <span>Đã có tài khoản?</span>
        <button type="button" onClick={onLoginClick}>
          Đăng nhập
        </button>
      </div>
    </form>
  )
}

export default RegisterForm
