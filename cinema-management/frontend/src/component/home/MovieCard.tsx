import { Link, useNavigate } from 'react-router-dom'
import type { Movie } from '../../types/movie'

interface MovieCardProps {
  movie: Movie
}

function MovieCard({ movie }: MovieCardProps) {
  const navigate = useNavigate()
  const isUpcoming = movie.status === 'UPCOMING'

  return (
    <article className="hp-card">
      <Link className="hp-card-poster" to={`/movies/${movie.id}`} aria-label={`Xem chi tiết phim ${movie.title}`}>
        <img src={movie.posterUrl} alt={movie.title} loading="lazy" />
        {movie.ageRating && <span className="hp-age">{movie.ageRating}</span>}
        {isUpcoming && <span className="hp-card-flag">Sắp chiếu</span>}
      </Link>

      <div className="hp-card-overlay">
        <button
          type="button"
          className="hp-btn hp-btn--primary"
          onClick={() => navigate(`/movies/${movie.id}#movie-showtimes`)}
        >
          {isUpcoming ? 'Xem chi tiết' : 'Đặt vé'}
        </button>
        {movie.trailerUrl && (
          <a className="hp-btn" href={movie.trailerUrl} target="_blank" rel="noreferrer">
            Trailer
          </a>
        )}
      </div>

      <div className="hp-card-info">
        <Link to={`/movies/${movie.id}`}>
          <h3>{movie.title}</h3>
        </Link>
        <div className="hp-card-meta">
          <span>{movie.durationMinutes} phút</span>
          {movie.language && <span>{movie.language}</span>}
        </div>
      </div>
    </article>
  )
}

export default MovieCard
