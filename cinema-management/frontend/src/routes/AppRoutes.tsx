import { BrowserRouter, Routes, Route } from "react-router-dom";

import { showtimeRoutes } from "./showtimeRoutes";
import { ticketPriceRoutes } from "./ticketPriceRoutes";
import { promotionRoutes } from "./PromotionRoutes";

function AppRoutes() {
    const routes = [
        ...showtimeRoutes,
        ...ticketPriceRoutes,
        ...promotionRoutes
    ];

    return (
        <BrowserRouter>
            <Routes>
                {routes.map((route) => (
                    <Route
                        key={route.path}
                        path={route.path}
                        element={route.element}
                    />
                ))}
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;