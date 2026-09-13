import { useNavigate, useParams } from "react-router-dom"

import CinemaRoomDetail from "../pages/admin/rooms/CinemaRoomDetail"
import CinemaRoomList from "../pages/admin/rooms/CinemaRoomList"
import MovieCreate from "../pages/admin/movies/MovieCreate"
import MovieEdit from "../pages/admin/movies/MovieEdit"
import MovieList from "../pages/admin/movies/MovieList"
import type { NavigateHandler } from "../types/admin"

function useAppNavigate(): NavigateHandler {
  const navigate = useNavigate()
  return (path: string) => navigate(path)
}

function MovieListRoute() {
  return <MovieList onNavigate={useAppNavigate()} />
}

function MovieCreateRoute() {
  return <MovieCreate onNavigate={useAppNavigate()} />
}

function MovieEditRoute() {
  const { movieId = "" } = useParams()
  return <MovieEdit movieId={movieId} onNavigate={useAppNavigate()} />
}

function CinemaRoomListRoute() {
  return <CinemaRoomList onNavigate={useAppNavigate()} />
}

function CinemaRoomDetailRoute() {
  const { roomId = "" } = useParams()
  return <CinemaRoomDetail roomId={roomId} onNavigate={useAppNavigate()} />
}

export const adminRoutes = [
  {
    path: "/",
    element: <MovieListRoute />,
  },
  {
    path: "/admin",
    element: <MovieListRoute />,
  },
  {
    path: "/admin/movies",
    element: <MovieListRoute />,
  },
  {
    path: "/admin/movies/create",
    element: <MovieCreateRoute />,
  },
  {
    path: "/admin/movies/:movieId/edit",
    element: <MovieEditRoute />,
  },
  {
    path: "/admin/cinema-rooms",
    element: <CinemaRoomListRoute />,
  },
  {
    path: "/admin/cinema-rooms/:roomId",
    element: <CinemaRoomDetailRoute />,
  },
]
