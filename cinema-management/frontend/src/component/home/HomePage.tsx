import { useEffect, useState } from 'react'
import { getNowShowingMovies } from '../../service/movie/movieService'
import type { AuthResponse } from '../../types/auth'
import type { Movie } from '../../types/movie'
import HomeFooter from './HomeFooter'
import HomeHeader from './HomeHeader'
import HomeHero from './HomeHero'
import MovieSection from './MovieSection'

interface HomePageProps {
  currentUser: AuthResponse | null
  onLogout: () => void
  onLoginClick: () => void
  onRegisterClick: () => void
}

function HomePage({ currentUser, onLogout, onLoginClick, onRegisterClick }: HomePageProps) {
  const [movies, setMovies] = useState<Movie[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const normalizedKeyword = searchKeyword.trim().toLowerCase()
  const filteredMovies = normalizedKeyword
    ? movies.filter((movie) =>
        [
          movie.title,
          movie.description,
          movie.director,
          movie.cast,
          movie.language,
          movie.ageRating,
          movie.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedKeyword)),
      )
    : movies

  useEffect(() => {
    getNowShowingMovies()
      .then((data) => {
        setMovies(data)
        setErrorMessage('')
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Không thể tải danh sách phim')
      })
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <main className="home-page">
      <HomeHeader
        currentUser={currentUser}
        onLoginClick={onLoginClick}
        onLogout={onLogout}
        searchValue={searchKeyword}
        onSearchChange={setSearchKeyword}
      />
      <div className="home-content">
        <p className="breadcrumb">Trang chủ - Premiere Cinemas</p>
        <HomeHero movies={movies} isLoading={isLoading} onBookingClick={onRegisterClick} />
        <MovieSection
          movies={filteredMovies}
          isLoading={isLoading}
          errorMessage={errorMessage}
          searchKeyword={searchKeyword}
        />
      </div>
      <HomeFooter />
    </main>
  )
}

export default HomePage
