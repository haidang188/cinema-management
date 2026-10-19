import AppRoutes from "./routes/AppRoutes";
import { ThemeProvider } from "./theme/ThemeContext";
import ThemeToggle from "./theme/ThemeToggle";
import AiChatWidget from "./component/ai/AiChatWidget";

import "./App.css";
import "./styles/admin-theme.css";
import "./styles/movie-admin.css";
import "./styles/cinema-room.css";
import "./styles/member-management.css";
import "./styles/employee-admin.css";
import "./styles/admin-components.css";
import "./styles/modal.css";
import "./theme/theme.css";

function App() {
    return (
        <ThemeProvider>
            <ThemeToggle />
            <AppRoutes />
            <AiChatWidget />
        </ThemeProvider>
    );
}

export default App;
