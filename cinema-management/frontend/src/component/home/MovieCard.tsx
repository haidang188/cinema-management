import type { Movie } from '../../types/movie'

interface MovieCardProps {
  movie: Movie
}

function MovieCard({ movie }: MovieCardProps) {
  return (
    <article className="movie-card">
      <div className="movie-poster" style={{ backgroundImage: `url(${movie.posterUrl})` }}>
        <span>{movie.ageRating}</span>
      </div>
      <div className="movie-card__body">
        <h3>{movie.title}</h3>
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
