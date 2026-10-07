import AppRoutes from "./routes/AppRoutes";
import { ThemeProvider } from "./theme/ThemeContext";
import ThemeToggle from "./theme/ThemeToggle";

import "./App.css";
import "./styles/movie-admin.css";
import "./styles/cinema-room.css";
import "./styles/member-management.css";
import "./styles/modal.css";
import "./theme/theme.css";
import "./styles/unified-ui.css";

function App() {
    return (
        <ThemeProvider>
            <ThemeToggle />
            <AppRoutes />
        </ThemeProvider>
    );
}

export default App;