import type { Movie, MovieGenre } from '../../types/movie'
import MovieCard from './MovieCard'

interface MovieFilters {
  status: string
  genreId: string
  date: string
}

interface DateOption {
  value: string
  label: string
}

interface MovieSectionProps {
  movies: Movie[]
  isLoading: boolean
  errorMessage: string
  searchKeyword?: string
  genres: MovieGenre[]
  filters: MovieFilters
  dateOptions: DateOption[]
  onFilterChange: (name: keyof MovieFilters, value: string) => void
  onApplyFilters: () => void
}

function MovieSection({
  movies,
  isLoading,
  errorMessage,
  searchKeyword = '',
  genres,
  filters,
  dateOptions,
  onFilterChange,
  onApplyFilters,
}: MovieSectionProps) {
  return (
    <section className="movie-section" id="movies">
      <div className="section-toolbar">
        <div className="movie-filters">
          <select
            aria-label="Trạng thái phim"
            value={filters.status}
            onChange={(event) => onFilterChange('status', event.target.value)}
          >
            <option value="SHOWING">Phim: Đang chiếu</option>
            <option value="UPCOMING">Phim: Sắp chiếu</option>
          </select>
          <select
            aria-label="Thể loại"
            value={filters.genreId}
            onChange={(event) => onFilterChange('genreId', event.target.value)}
          >
            <option value="">Thể loại: Tất cả</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Ngày"
            value={filters.date}
            onChange={(event) => onFilterChange('date', event.target.value)}
          >
            <option value="">Ngày: Tất cả</option>
            {dateOptions.map((dateOption) => (
              <option key={dateOption.value} value={dateOption.value}>
                Ngày: {dateOption.label}
              </option>
            ))}
          </select>
          <select aria-label="Rạp">
            <option>Rạp: Tất cả</option>
          </select>
          <button className="movie-filter-button" type="button" onClick={onApplyFilters}>
            Lọc
          </button>
        </div>
      </div>
      {isLoading && <p className="movie-state">Đang tải phim từ cơ sở dữ liệu...</p>}
      {errorMessage && <p className="movie-state movie-state--error">{errorMessage}</p>}
      {!isLoading && !errorMessage && movies.length === 0 && (
        <p className="movie-state">
          {searchKeyword.trim()
            ? `Không tìm thấy phim phù hợp với "${searchKeyword.trim()}".`
            : 'Chưa có phim để hiển thị.'}
        </p>
      )}
      {!isLoading && !errorMessage && movies.length > 0 && (
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
