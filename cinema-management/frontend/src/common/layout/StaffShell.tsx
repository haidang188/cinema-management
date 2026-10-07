import type { ReactNode } from "react"
import type { AuthResponse } from "../../types/auth"
import Layout from "./Layout"
import Sidebar from "./Sidebar"
import Header from "./Header"
import Footer from "./Footer"
import { employeeMenu } from "./menu"

interface StaffShellProps {
    children: ReactNode
    currentUser: AuthResponse | null
    onLogout: () => void
}

export default function StaffShell({
    children,
    currentUser,
    onLogout,
}: StaffShellProps) {
    const displayName = currentUser?.fullName || currentUser?.email

    return (
        <div className="workspace-shell">
            <Layout
                sidebar={
                    <Sidebar
                        brand="PREMIERE STAFF"
                        items={employeeMenu}
                        onLogout={currentUser ? onLogout : undefined}
                    />
                }
                header={
                    <Header
                        title="Không gian nhân viên"
                        rightContent={
                            displayName ? (
                                <span title={displayName}>Xin chào, {displayName}</span>
                            ) : undefined
                        }
                    />
                }
                footer={<Footer />}
            >
                {children}
            </Layout>
        </div>
    )
}