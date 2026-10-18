import AppRoutes from "./routes/AppRoutes";
import { ThemeProvider } from "./theme/ThemeContext";

import "./App.css";
import "./styles/admin-theme.css";
import "./styles/movie-admin.css";
import "./styles/cinema-room.css";
import "./styles/member-management.css";
import "./styles/employee-admin.css";
import "./styles/admin-components.css";
import "./styles/modal.css";
import "./theme/theme.css";
// Phải import SAU CÙNG: token thiết kế chung + lớp giao diện admin/staff theo trang "Quản lý đặt vé".
import "./styles/design-tokens.css";
import "./styles/admin-ui.css";

function App() {
    return (
        <ThemeProvider>
            <AppRoutes />
        </ThemeProvider>
    );
}

export default App;
