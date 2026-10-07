import { Navigate } from "react-router-dom"
import CounterSaleResult from "../../component/counter-sale/CounterSaleResult"
import StaffShell from "../../common/layout/StaffShell"
import { useAuth } from "../../hooks/useAuth"

export default function CounterSaleResultPage() {
    const { currentUser, logout } = useAuth()

    if (!currentUser) return <Navigate to="/login" replace />

    return (
        <StaffShell currentUser={currentUser} onLogout={logout}>
            <CounterSaleResult />
        </StaffShell>
    )
}