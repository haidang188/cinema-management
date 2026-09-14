import { useEffect, useMemo, useState } from 'react'
import type { Movie } from '../../types/movie'

interface HomeHeroProps {
  movies: Movie[]
  isLoading: boolean
  onBookingClick: () => void
}

function HomeHero({ movies, isLoading, onBookingClick }: HomeHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeMovie = useMemo(() => movies[activeIndex] ?? null, [activeIndex, movies])

  useEffect(() => {
    if (movies.length < 2) {
      return
    }

    const timerId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % movies.length)
    }, 4500)

    return () => window.clearInterval(timerId)
  }, [movies.length])

  if (isLoading) {
    return <section className="featured-carousel featured-carousel--empty">Đang tải phim...</section>
  }

  if (!activeMovie) {
    return <section className="featured-carousel featured-carousel--empty">Chưa có phim đang chiếu</section>
  }

  return (
    <section className="featured-carousel" aria-label="Phim đang chiếu nổi bật">
      <div className="featured-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
        {movies.map((movie) => (
          <article
            key={movie.id}
            className="featured-card"
            style={{ backgroundImage: `url(${movie.posterUrl})` }}
          >
            <div className="featured-card__content">
              <span className="hero-date">Khởi chiếu: {formatDate(movie.releaseDate)}</span>
              <h1>{movie.title}</h1>
              <p>{movie.description}</p>
              <div className="movie-meta">
                <span>{movie.ageRating}</span>
                <span>{movie.durationMinutes} phút</span>
                <span>{movie.language}</span>
              </div>
              <div className="hero-buttons">
                <button type="button" onClick={onBookingClick}>
                  Đặt vé ngay
                </button>
                <a className="outline-button" href={movie.trailerUrl} target="_blank" rel="noreferrer">
                  Xem trailer
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="featured-preview" aria-hidden="true">
        {movies.slice(0, 3).map((movie) => (
          <div
            key={movie.id}
            className={movie.id === activeMovie.id ? 'is-active' : ''}
            style={{ backgroundImage: `url(${movie.posterUrl})` }}
          >
            <span>{movie.title}</span>
          </div>
        ))}
      </div>
      <div className="featured-dots" aria-label="Chọn phim nổi bật">
        {movies.map((movie, index) => (
          <button
            key={movie.id}
            type="button"
            aria-label={`Xem ${movie.title}`}
            className={index === activeIndex ? 'is-active' : ''}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
    </section>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('vi-VN').format(date)
}

export default HomeHero
