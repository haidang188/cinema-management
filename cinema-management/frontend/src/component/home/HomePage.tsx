import { useEffect, useMemo, useState } from 'react'
import { getGenres, getHomeMovies } from '../../service/movie/movieService'
import type { AuthResponse } from '../../types/auth'
import type { MovieGenre, Movie } from '../../types/movie'
import HomeFooter from './HomeFooter'
import HomeHeader from './HomeHeader'
import HomeHero from './HomeHero'
import MovieSection from './MovieSection'
import type { MovieFilters } from './MovieSection'
import './HomePage.css'

const DEFAULT_FILTERS: MovieFilters = {
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
          : index === 1
            ? 'Ngày mai'
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

function HomePage({ currentUser, onLogout, onLoginClick }: HomePageProps) {
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([])
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(true)
  const [movies, setMovies] = useState<Movie[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [genres, setGenres] = useState<MovieGenre[]>([])
  const [filters, setFilters] = useState<MovieFilters>(DEFAULT_FILTERS)
  const dateOptions = useMemo(getNextSevenDays, [])

  const normalizedKeyword = searchKeyword.trim().toLocaleLowerCase('vi-VN')
  const filteredMovies = normalizedKeyword
    ? movies.filter((movie) =>
        [movie.title, movie.director, movie.cast]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase('vi-VN').includes(normalizedKeyword)),
      )
    : movies

  useEffect(() => {
    getHomeMovies(DEFAULT_FILTERS)
      .then((data) => setFeaturedMovies(data.slice(0, 6)))
      .catch(() => setFeaturedMovies([]))
      .finally(() => setIsFeaturedLoading(false))

    getGenres().then(setGenres).catch(() => setGenres([]))
  }, [])

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    getHomeMovies(filters)
      .then((data) => {
        if (!cancelled) {
          setMovies(data)
          setErrorMessage('')
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Không thể tải danh sách phim')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [filters])

  function updateFilter(name: keyof MovieFilters, value: string) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }))
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
    setSearchKeyword('')
  }

  return (
    <main className="home-page customer-shell">
      <HomeHeader currentUser={currentUser} onLoginClick={onLoginClick} onLogout={onLogout} />
      <div className="home-content">
        <div className="hp">
          <HomeHero movies={featuredMovies} isLoading={isFeaturedLoading} />
          <MovieSection
            movies={filteredMovies}
            isLoading={isLoading}
            errorMessage={errorMessage}
            searchKeyword={searchKeyword}
            onSearchChange={setSearchKeyword}
            genres={genres}
            filters={filters}
            isFiltered={filters.genreId !== '' || filters.date !== '' || filters.status !== DEFAULT_FILTERS.status || normalizedKeyword !== ''}
            dateOptions={dateOptions}
            onFilterChange={updateFilter}
            onResetFilters={resetFilters}
          />
        </div>
      </div>
      <HomeFooter />
    </main>
  )
}

export default HomePage
