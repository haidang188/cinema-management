import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Movie } from '../../types/movie'

interface HomeHeroProps {
  movies: Movie[]
  isLoading: boolean
}

function HomeHero({ movies, isLoading }: HomeHeroProps) {
  const navigate = useNavigate()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const activeMovie = movies[activeIndex] ?? movies[0] ?? null

  useEffect(() => {
    if (movies.length < 2 || isPaused) {
      return
    }

    const timerId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % movies.length)
    }, 6000)

    return () => window.clearInterval(timerId)
  }, [movies.length, isPaused])

  if (isLoading) {
    return <section className="hp-hero hp-hero--loading" aria-busy="true" />
  }

  if (!activeMovie) {
    return null
  }

  const step = (offset: number) =>
    setActiveIndex((currentIndex) => (currentIndex + offset + movies.length) % movies.length)

  return (
    <section
      className="hp-hero"
      aria-label="Phim đang chiếu nổi bật"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="hp-hero-backdrop" style={{ backgroundImage: `url(${activeMovie.posterUrl})` }} />

      <div className="hp-hero-main" key={activeMovie.id}>
        <Link to={`/movies/${activeMovie.id}`} className="hp-hero-poster">
          <img src={activeMovie.posterUrl} alt={activeMovie.title} />
          {activeMovie.ageRating && <span className="hp-age">{activeMovie.ageRating}</span>}
        </Link>

        <div className="hp-hero-info">
          <span className="hp-eyebrow">Đang chiếu nổi bật</span>
          <Link to={`/movies/${activeMovie.id}`} className="hp-hero-title">
            <h1>{activeMovie.title}</h1>
          </Link>

          <div className="hp-pills">
            <span>{activeMovie.durationMinutes} phút</span>
            {activeMovie.language && <span>{activeMovie.language}</span>}
            {activeMovie.releaseDate && <span>Khởi chiếu {formatDate(activeMovie.releaseDate)}</span>}
          </div>

          {activeMovie.description && <p className="hp-hero-desc">{activeMovie.description}</p>}

          <div className="hp-actions">
            <button
              type="button"
              className="hp-btn hp-btn--primary"
              onClick={() => navigate(`/movies/${activeMovie.id}#movie-showtimes`)}
            >
              Đặt vé ngay
            </button>
            {activeMovie.trailerUrl && (
              <a className="hp-btn" href={activeMovie.trailerUrl} target="_blank" rel="noreferrer">
                ▶ Xem trailer
              </a>
            )}
          </div>
        </div>
      </div>

      {movies.length > 1 && (
        <div className="hp-hero-rail">
          <button type="button" className="hp-nav" onClick={() => step(-1)} aria-label="Phim trước">
            ‹
          </button>
          <div className="hp-thumbs">
            {movies.map((movie, index) => (
              <button
                key={movie.id}
                type="button"
                className={`hp-thumb${index === activeIndex ? ' selected' : ''}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Xem ${movie.title}`}
                title={movie.title}
              >
                <img src={movie.posterUrl} alt="" loading="lazy" />
              </button>
            ))}
          </div>
          <button type="button" className="hp-nav" onClick={() => step(1)} aria-label="Phim sau">
            ›
          </button>
        </div>
      )}
    </section>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN').format(new Date(value))
}

export default HomeHero
