import type { AuthMode, LoginPayload, RegisterPayload } from '../../types/auth'
import AuthHero from './AuthHero'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

interface AuthPageProps {
  mode: AuthMode
  message: string
  isLoading: boolean
  onModeChange: (mode: AuthMode) => void
  onLogin: (payload: LoginPayload) => Promise<void>
  onRegister: (payload: RegisterPayload) => Promise<void>
}

function AuthPage({
  mode,
  message,
  isLoading,
  onModeChange,
  onLogin,
  onRegister,
}: AuthPageProps) {
  return (
    <main className={`auth-page auth-page--${mode}`}>
      <AuthHero compact={mode === 'register'} />
      <section className="auth-workspace" aria-label="Khu vực tài khoản">
        {mode === 'login' ? (
          <LoginForm
            message={message}
            isLoading={isLoading}
            onSubmit={onLogin}
            onRegisterClick={() => onModeChange('register')}
          />
        ) : (
          <RegisterForm
            message={message}
            isLoading={isLoading}
            onSubmit={onRegister}
            onLoginClick={() => onModeChange('login')}
          />
        )}
      </section>
    </main>
  )
}

export default AuthPage
