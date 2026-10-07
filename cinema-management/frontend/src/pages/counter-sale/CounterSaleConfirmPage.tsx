import { Navigate } from "react-router-dom"
import CounterSaleConfirm from "../../component/counter-sale/CounterSaleConfirm"
import StaffShell from "../../common/layout/StaffShell"
import { useAuth } from "../../hooks/useAuth"

export default function CounterSaleConfirmPage() {
    const { currentUser, logout } = useAuth()

    if (!currentUser) return <Navigate to="/login" replace />

    return (
        <StaffShell currentUser={currentUser} onLogout={logout}>
            <CounterSaleConfirm />
        </StaffShell>
    )
}