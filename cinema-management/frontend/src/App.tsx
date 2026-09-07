import { useState } from 'react'
import './App.css'
import AuthPage from './components/auth/AuthPage'
import AccountDashboard from './components/dashboard/AccountDashboard'
import { login, register } from './services/authApi'
import type { AuthMode, AuthResponse, LoginPayload, RegisterPayload } from './types/auth'

function App() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [currentUser, setCurrentUser] = useState<AuthResponse | null>(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (payload: LoginPayload) => {
    setIsLoading(true)
    setMessage('')
    try {
      const user = await login(payload)
      setCurrentUser(user)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Đăng nhập thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (payload: RegisterPayload) => {
    setIsLoading(true)
    setMessage('')
    try {
      const user = await register(payload)
      setCurrentUser(user)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Đăng ký thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  if (currentUser) {
    return <AccountDashboard user={currentUser} onLogout={() => setCurrentUser(null)} />
  }

  return (
    <AuthPage
      mode={mode}
      message={message}
      isLoading={isLoading}
      onModeChange={setMode}
      onLogin={handleLogin}
      onRegister={handleRegister}
    />
  )
}

export default App
