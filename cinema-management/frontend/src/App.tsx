import AppRoutes from "./routes/AppRoutes";
import { ThemeProvider } from "./theme/ThemeContext";
import ThemeToggle from "./theme/ThemeToggle";

import "./App.css";
import "./theme/theme.css";

function App() {
    return (
        <ThemeProvider>
            <ThemeToggle />
            <AppRoutes />
        </ThemeProvider>
    );
}

export default App;
