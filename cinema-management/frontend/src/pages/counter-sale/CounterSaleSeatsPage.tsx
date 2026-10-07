import { Navigate } from "react-router-dom"
import CounterSaleSeats from "../../component/counter-sale/CounterSaleSeats"
import StaffShell from "../../common/layout/StaffShell"
import { useAuth } from "../../hooks/useAuth"

export default function CounterSaleSeatsPage() {
    const { currentUser, logout } = useAuth()

    if (!currentUser) return <Navigate to="/login" replace />

    return (
        <StaffShell currentUser={currentUser} onLogout={logout}>
            <CounterSaleSeats />
        </StaffShell>
    )
}