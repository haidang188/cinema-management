import { useNavigate } from 'react-router-dom'
import type { Movie } from '../../types/movie'

interface MovieCardProps {
  movie: Movie
}

function MovieCard({ movie }: MovieCardProps) {
  const navigate = useNavigate()

  function openMovieDetail() {
    navigate(`/movies/${movie.id}`)
  }

  return (
    <article className="movie-card">
      <button
        className="movie-poster movie-poster--button"
        style={{ backgroundImage: `url(${movie.posterUrl})` }}
        type="button"
        onClick={openMovieDetail}
        aria-label={`Xem chi tiết phim ${movie.title}`}
      >
        <span>{movie.ageRating}</span>
      </button>
      <div className="movie-card__body">
        <button className="movie-card__title-button" type="button" onClick={openMovieDetail}>
          <h3>{movie.title}</h3>
        </button>
        <p>
          {movie.durationMinutes} phút - {movie.language}
        </p>
        <p className="movie-card__description">{movie.description}</p>
        <div className="movie-card__actions">
          <a href={movie.trailerUrl} target="_blank" rel="noreferrer">
            Xem trailer
          </a>
          <button type="button">Đặt vé ngay</button>
        </div>
      </div>
    </article>
  )
}

export default MovieCard
