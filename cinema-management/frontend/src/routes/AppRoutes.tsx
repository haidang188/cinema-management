import { BrowserRouter, Routes, Route } from "react-router-dom";

import CinemaRoomDetail from "../pages/admin/rooms/CinemaRoomDetail.jsx";
import CinemaRoomList from "../pages/admin/rooms/CinemaRoomList.jsx";
import MovieCreate from "../pages/admin/movies/MovieCreate.jsx";
import MovieEdit from "../pages/admin/movies/MovieEdit.jsx";
import MovieList from "../pages/admin/movies/MovieList.jsx";
import { showtimeRoutes } from "./showtimeRoutes";
import { ticketPriceRoutes } from "./ticketPriceRoutes";

function navigate(path: string) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
}

function AppRoutes() {
    const routes = [
        {
            path: "/",
            element: <MovieList onNavigate={navigate} />
        },
        {
            path: "/admin",
            element: <MovieList onNavigate={navigate} />
        },
        {
            path: "/admin/movies",
            element: <MovieList onNavigate={navigate} />
        },
        {
            path: "/admin/movies/create",
            element: <MovieCreate onNavigate={navigate} />
        },
        {
            path: "/admin/movies/:movieId/edit",
            element: <MovieEditRoute />
        },
        {
            path: "/admin/cinema-rooms",
            element: <CinemaRoomList onNavigate={navigate} />
        },
        {
            path: "/admin/cinema-rooms/:roomId",
            element: <CinemaRoomDetailRoute />
        },
        ...showtimeRoutes,
        ...ticketPriceRoutes
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

function MovieEditRoute() {
    const movieId = window.location.pathname.match(/^\/admin\/movies\/(\d+)\/edit$/)?.[1] ?? "";
    return <MovieEdit movieId={movieId} onNavigate={navigate} />;
}

function CinemaRoomDetailRoute() {
    const roomId = window.location.pathname.match(/^\/admin\/cinema-rooms\/(\d+)$/)?.[1] ?? "";
    return <CinemaRoomDetail roomId={roomId} onNavigate={navigate} />;
}

export default AppRoutes;
