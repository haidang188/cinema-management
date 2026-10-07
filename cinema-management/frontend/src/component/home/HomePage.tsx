import { useEffect, useState } from 'react'
import { getGenres, getHomeMovies } from '../../service/movie/movieService'
import type { AuthResponse } from '../../types/auth'
import type { MovieGenre, Movie } from '../../types/movie'
import HomeFooter from './HomeFooter'
import HomeHeader from './HomeHeader'
import HomeHero from './HomeHero'
import MovieSection from './MovieSection'

const DEFAULT_FILTERS = {
  status: 'SHOWING',
  genreId: '',
  date: '',
}

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getNextSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)

    return {
      value: formatDateValue(date),
      label:
        index === 0
          ? 'Hôm nay'
          : date.toLocaleDateString('vi-VN', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit',
            }),
    }
  })
}

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
  const [genres, setGenres] = useState<MovieGenre[]>([])
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS)
  const dateOptions = getNextSevenDays()

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
    setIsLoading(true)
    getHomeMovies(appliedFilters)
      .then((data) => {
        setMovies(data)
        setErrorMessage('')
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Không thể tải danh sách phim')
      })
      .finally(() => setIsLoading(false))
  }, [appliedFilters])

  useEffect(() => {
    getGenres().then(setGenres).catch(() => setGenres([]))
  }, [])

  function updateDraftFilter(name: keyof typeof DEFAULT_FILTERS, value: string) {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }))
  }

  function applyMovieFilters() {
    setAppliedFilters(draftFilters)
  }

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
          genres={genres}
          filters={draftFilters}
          dateOptions={dateOptions}
          onFilterChange={updateDraftFilter}
          onApplyFilters={applyMovieFilters}
        />
      </div>
      <HomeFooter />
    </main>
  )
}

export default HomePage
