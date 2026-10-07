import { Navigate } from "react-router-dom"
import CounterSale from "../../component/counter-sale/CounterSale"
import StaffShell from "../../common/layout/StaffShell"
import { useAuth } from "../../hooks/useAuth"

export default function CounterSalePage() {
    const { currentUser, logout } = useAuth()

    if (!currentUser) return <Navigate to="/login" replace />

    return (
        <StaffShell currentUser={currentUser} onLogout={logout}>
            <CounterSale />
        </StaffShell>
    )
}