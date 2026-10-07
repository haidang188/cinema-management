import StaffShell from "../../common/layout/StaffShell"
import BookingManagement from "../../component/booking-management/BookingManagement"
import { useAuth } from "../../hooks/useAuth"

export default function BookingManagementPage() {
    const { currentUser, logout } = useAuth()

    return (
        <StaffShell currentUser={currentUser} onLogout={logout}>
            <BookingManagement />
        </StaffShell>
    )
}