import type { AuthResponse } from '../../types/auth'

interface AccountDashboardProps {
  user: AuthResponse
  onLogout: () => void
}

function AccountDashboard({ user, onLogout }: AccountDashboardProps) {
  const roleLabel =
    user.role === 'ADMIN' ? 'Quản trị viên' : user.role === 'EMPLOYEE' ? 'Nhân viên' : 'Khách hàng'

  return (
    <main className="dashboard-shell">
      <section className="dashboard-panel">
        <div>
          <p className="dashboard-kicker">PREMIERE</p>
          <h1>Xin chào, {user.fullName || user.email}</h1>
          <p className="dashboard-role">Vai trò: {roleLabel}</p>
        </div>
        <button type="button" className="secondary-action" onClick={onLogout}>
          Đăng xuất
        </button>
      </section>
    </main>
  )
}

export default AccountDashboard
