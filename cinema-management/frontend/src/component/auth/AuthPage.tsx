import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AuthFieldErrors, AuthMode, LoginPayload, RegisterPayload } from '../../types/auth'
import AuthHero from './AuthHero'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import './Auth.css'

interface AuthPageProps {
  mode: AuthMode
  message: string
  fieldErrors: AuthFieldErrors
  isLoading: boolean
  onModeChange: (mode: AuthMode) => void
  onLogin: (payload: LoginPayload) => Promise<void>
  onRegister: (payload: RegisterPayload) => Promise<void>
}

function AuthPage({
  mode,
  message,
  fieldErrors,
  isLoading,
  onModeChange,
  onLogin,
  onRegister,
}: AuthPageProps) {
  return (
    <main className={`au au--${mode}`}>
      <AuthHero />

      <section className="au-workspace" aria-label="Khu vực tài khoản">
        <div className="au-topbar">
          <Link to="/" className="au-logo">PREMIERE CINEMAS</Link>
          <Link to="/" className="au-back"><ArrowLeft size={14} /> Về trang chủ</Link>
        </div>

        <div className="au-form-wrap">
          <div className="au-tabs" role="tablist" aria-label="Tài khoản">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => mode !== 'login' && onModeChange('login')}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'active' : ''}
              onClick={() => mode !== 'register' && onModeChange('register')}
            >
              Đăng ký
            </button>
          </div>

          {mode === 'login' ? (
            <LoginForm
              message={message}
              fieldErrors={fieldErrors}
              isLoading={isLoading}
              onSubmit={onLogin}
              onRegisterClick={() => onModeChange('register')}
            />
          ) : (
            <RegisterForm
              message={message}
              fieldErrors={fieldErrors}
              isLoading={isLoading}
              onSubmit={onRegister}
              onLoginClick={() => onModeChange('login')}
            />
          )}
        </div>

        <p className="au-foot">© {new Date().getFullYear()} Premiere Cinemas</p>
      </section>
    </main>
  )
}

export default AuthPage
