import type { Movie } from '../../types/movie'
import MovieCard from './MovieCard'

interface MovieSectionProps {
  movies: Movie[]
  isLoading: boolean
  errorMessage: string
}

function MovieSection({ movies, isLoading, errorMessage }: MovieSectionProps) {
  return (
    <section className="movie-section" id="movies">
      <div className="section-toolbar">
        <div className="movie-tabs">
          <button className="is-active" type="button">
            Đang chiếu
          </button>
          <button type="button">Sắp chiếu</button>
        </div>
        <div className="movie-filters">
          <select aria-label="Thể loại">
            <option>Thể loại: Tất cả</option>
          </select>
          <select aria-label="Ngày">
            <option>Ngày: Hôm nay</option>
          </select>
          <select aria-label="Rạp">
            <option>Rạp: Tất cả</option>
          </select>
        </div>
      </div>
      {isLoading && <p className="movie-state">Đang tải phim từ cơ sở dữ liệu...</p>}
      {errorMessage && <p className="movie-state movie-state--error">{errorMessage}</p>}
      {!isLoading && !errorMessage && (
        <div className="movie-grid">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </section>
  )
}

export default MovieSection
