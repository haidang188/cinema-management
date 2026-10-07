import CounterSaleSeats from "../../component/counter-sale/CounterSaleSeats";
import Layout from "../../common/layout/Layout";
import Sidebar from "../../common/layout/Sidebar";
import Header from "../../common/layout/Header";
import Footer from "../../common/layout/Footer";
import { employeeMenu } from "../../common/layout/menu";
import { useAuth } from "../../hooks/useAuth";
import { Navigate } from "react-router-dom";

function CounterSaleSeatsPage() {
    const { currentUser, logout } = useAuth();

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    const displayName = currentUser.fullName || currentUser.email;

    return (
        <Layout
            sidebar={
                <Sidebar
                    brand="PREMIERE STAFF"
                    items={employeeMenu}
                    onLogout={logout}
                />
            }
            header={
                <Header
                    rightContent={<span>Xin chào, {displayName}</span>}
                />
            }
            footer={<Footer />}
        >
            <CounterSaleSeats />
        </Layout>
    );
}

export default CounterSaleSeatsPage;