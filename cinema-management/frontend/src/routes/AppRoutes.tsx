import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom"

import AuthPage from "../component/auth/AuthPage"
import HomePage from "../component/home/HomePage"
import { getHomePath, useAuth } from "../hooks/useAuth"
import type { AuthMode } from "../types/auth"
import { adminRoutes } from "./adminRoutes"
import { promotionRoutes } from "./PromotionRoutes"
import { AdminShell, CustomerShell } from "./RouteShells"
import { showtimeRoutes } from "./showtimeRoutes"
import { ticketPriceRoutes } from "./ticketPriceRoutes"

function AppRouteContent() {
  const navigate = useNavigate()
  const {
    authFieldErrors,
    authLoading,
    authMessage,
    clearAuthFeedback,
    currentUser,
    goToLogin,
    goToRegister,
    loginUser,
    logout,
    registerUser,
  } = useAuth()

  function renderAuthPage(mode: AuthMode) {
    if (currentUser) {
      return <Navigate to={getHomePath(currentUser)} replace />
    }

    return (
      <AuthPage
        mode={mode}
        message={authMessage}
        fieldErrors={authFieldErrors}
        isLoading={authLoading}
        onModeChange={(nextMode) => {
          clearAuthFeedback()
          navigate(nextMode === "login" ? "/login" : "/register")
        }}
        onLogin={loginUser}
        onRegister={registerUser}
      />
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomePage
            currentUser={currentUser}
            onLogout={logout}
            onLoginClick={goToLogin}
            onRegisterClick={goToRegister}
          />
        }
      />

      <Route path="/login" element={renderAuthPage("login")} />
      <Route path="/register" element={renderAuthPage("register")} />

      {[...showtimeRoutes, ...ticketPriceRoutes].map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <CustomerShell currentUser={currentUser} onLogout={logout} onLoginClick={goToLogin}>
              {route.element}
            </CustomerShell>
          }
        />
      ))}

      {[...adminRoutes, ...promotionRoutes].map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <AdminShell currentUser={currentUser} onLogout={logout} onLoginClick={goToLogin}>
              {route.element}
            </AdminShell>
          }
        />
      ))}

      <Route path="*" element={<Navigate to={getHomePath(currentUser)} replace />} />
    </Routes>
  )
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <AppRouteContent />
    </BrowserRouter>
  )
}

export default AppRoutes
