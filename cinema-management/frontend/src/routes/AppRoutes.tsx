import { BrowserRouter, Routes, Route } from "react-router-dom";

<<<<<<< HEAD
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
=======
import { appRoutes } from "./appRouteConfig";

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                {appRoutes.map((route) => (
>>>>>>> 0594784ec9746a7697c56977aa7ff6335768b4d3
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

<<<<<<< HEAD
export default AppRoutes;
=======
export default AppRoutes;
>>>>>>> 0594784ec9746a7697c56977aa7ff6335768b4d3
