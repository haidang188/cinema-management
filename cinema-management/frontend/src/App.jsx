import { useEffect, useState } from 'react'
import CinemaRoomDetail from './pages/admin/rooms/CinemaRoomDetail.jsx'
import CinemaRoomList from './pages/admin/rooms/CinemaRoomList.jsx'
import MovieCreate from './pages/admin/movies/MovieCreate.jsx'
import MovieEdit from './pages/admin/movies/MovieEdit.jsx'
import MovieList from './pages/admin/movies/MovieList.jsx'
import './App.css'

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function getRoute(pathname) {
  if (pathname === '/' || pathname === '/admin') {
    return { name: 'list' }
  }
  if (pathname === '/admin/movies') {
    return { name: 'list' }
  }
  if (pathname === '/admin/movies/create') {
    return { name: 'create' }
  }
  if (pathname === '/admin/cinema-rooms') {
    return { name: 'roomList' }
  }
  const roomDetailMatch = pathname.match(/^\/admin\/cinema-rooms\/(\d+)$/)
  if (roomDetailMatch) {
    return { name: 'roomDetail', id: roomDetailMatch[1] }
  }

  const editMatch = pathname.match(/^\/admin\/movies\/(\d+)\/edit$/)
  if (editMatch) {
    return { name: 'edit', id: editMatch[1] }
  }

  return { name: 'notFound' }
}

function App() {
  const [route, setRoute] = useState(() => getRoute(window.location.pathname))

  useEffect(() => {
    const handleRouteChange = () => setRoute(getRoute(window.location.pathname))
    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [])

  if (route.name === 'create') {
    return <MovieCreate onNavigate={navigate} />
  }

  if (route.name === 'edit') {
    return <MovieEdit movieId={route.id} onNavigate={navigate} />
  }

  if (route.name === 'roomList') {
    return <CinemaRoomList onNavigate={navigate} />
  }

  if (route.name === 'roomDetail') {
    return <CinemaRoomDetail roomId={route.id} onNavigate={navigate} />
  }

  if (route.name === 'notFound') {
    return (
      <main className="app-shell">
        <section className="notice-panel">
          <h1>Không tìm thấy trang</h1>
          <button type="button" className="primary-button" onClick={() => navigate('/admin/cinema-rooms')}>
            Về quản lý phòng chiếu
          </button>
        </section>
      </main>
    )
  }

  return <MovieList onNavigate={navigate} />
}

export default App
