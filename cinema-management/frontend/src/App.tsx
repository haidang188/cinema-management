import { useState } from 'react'
import './App.css'
import AuthPage from './components/auth/AuthPage'
import HomePage from './components/home/HomePage'
import { login, register } from './services/authApi'
import type { AuthMode, AuthResponse, LoginPayload, RegisterPayload } from './types/auth'

type AppView = 'home' | 'auth'

function App() {
  const [view, setView] = useState<AppView>('home')
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
      setView('home')
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
      setView('home')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Đăng ký thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  if (view === 'home') {
    return (
      <HomePage
        currentUser={currentUser}
        onLogout={() => setCurrentUser(null)}
        onLoginClick={() => {
          setMode('login')
          setMessage('')
          setView('auth')
        }}
        onRegisterClick={() => {
          setMode('register')
          setMessage('')
          setView('auth')
        }}
      />
    )
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
