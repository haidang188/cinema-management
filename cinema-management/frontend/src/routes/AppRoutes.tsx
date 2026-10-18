import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom"
import type { ReactNode } from "react"

import AuthPage from "../component/auth/AuthPage"
import HomePage from "../component/home/HomePage"
import { getHomePath, useAuth } from "../hooks/useAuth"
import MovieDetailPage from "../pages/movies/MovieDetailPage"
import BookingSeatsPage from "../pages/booking/BookingSeatsPage"
import BookingConfirmPage from "../pages/booking/BookingConfirmPage"
import BookingResultPage from "../pages/booking/BookingResultPage"
import type { AuthMode } from "../types/auth"
import { adminRoutes } from "./adminRoutes"
import { promotionRoutes } from "./PromotionRoutes"
import { AdminShell, CustomerShell, RoleShell, StaffShell, WorkspaceShell } from "./RouteShells"
import { showtimeRoutes } from "./showtimeRoutes"
import { ticketPriceRoutes } from "./ticketPriceRoutes"
import { counterSaleRoutes } from "./counterSaleRoutes"
import { bookingManagementRoutes } from "./bookingManagementRoutes"
import AccountPage from "../pages/account/AccountPage"
import PromotionsPage from "../pages/customer/PromotionsPage"
import BookingHistoryPage from "../pages/customer/BookingHistoryPage"
import { ticketPickupRoutes } from "./ticketPickupRoutes"


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
    updateCurrentUser,
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

  function renderMemberPage(page: ReactNode, allowPendingDeletion = false) {
    if (!currentUser) return <Navigate to="/login" replace />
    if (currentUser.role !== "MEMBER") return <Navigate to={getHomePath(currentUser)} replace />
    if (currentUser.accountStatus === "PENDING_DELETION" && !allowPendingDeletion) {
      return <Navigate to="/account/recovery" replace />
    }

    return (
      <CustomerShell currentUser={currentUser} onLogout={logout} onLoginClick={goToLogin}>
        {page}
      </CustomerShell>
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

      <Route
        path="/movies/:movieId"
        element={<MovieDetailPage currentUser={currentUser} onLoginClick={goToLogin} onLogout={logout} />}
      />

      <Route path="/login" element={renderAuthPage("login")} />
      <Route path="/register" element={renderAuthPage("register")} />

      <Route path="/booking/showtimes/:showtimeId/seats" element={renderMemberPage(currentUser && <BookingSeatsPage currentUser={currentUser} />)} />
      <Route path="/booking/confirm" element={renderMemberPage(currentUser && <BookingConfirmPage currentUser={currentUser} />)} />
      <Route path="/booking/result/:bookingCode" element={renderMemberPage(currentUser && <BookingResultPage currentUser={currentUser} />)} />
      <Route path="/payment/vnpay-return" element={renderMemberPage(currentUser && <BookingResultPage currentUser={currentUser} />)} />
      <Route path="/account" element={renderMemberPage(currentUser && <AccountPage currentUser={currentUser} onUserChanged={updateCurrentUser} />)} />
      <Route path="/account/recovery" element={renderMemberPage(currentUser && <AccountPage currentUser={currentUser} onUserChanged={updateCurrentUser} />, true)} />
      <Route path="/booking-history" element={renderMemberPage(currentUser && <BookingHistoryPage currentUser={currentUser} />)} />
      <Route path="/promotions" element={<CustomerShell currentUser={currentUser} onLogout={logout} onLoginClick={goToLogin}><PromotionsPage /></CustomerShell>} />

      {[...showtimeRoutes, ...ticketPriceRoutes].map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <RoleShell currentUser={currentUser} onLogout={logout} onLoginClick={goToLogin}>
              {route.element}
            </RoleShell>
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

      {[...counterSaleRoutes, ...ticketPickupRoutes].map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <StaffShell currentUser={currentUser} onLogout={logout} onLoginClick={goToLogin}>
              {route.element}
            </StaffShell>
          }
        />
      ))}

      {bookingManagementRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <WorkspaceShell currentUser={currentUser} onLogout={logout} onLoginClick={goToLogin}>
              {route.element}
            </WorkspaceShell>
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
