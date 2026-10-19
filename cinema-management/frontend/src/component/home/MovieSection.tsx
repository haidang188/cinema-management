import type { Movie, MovieGenre } from '../../types/movie'
import MovieCard from './MovieCard'

export interface MovieFilters {
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
  searchKeyword: string
  onSearchChange: (value: string) => void
  genres: MovieGenre[]
  filters: MovieFilters
  isFiltered: boolean
  dateOptions: DateOption[]
  onFilterChange: (name: keyof MovieFilters, value: string) => void
  onResetFilters: () => void
}

const STATUS_TABS = [
  { value: 'SHOWING', label: 'Đang chiếu' },
  { value: 'UPCOMING', label: 'Sắp chiếu' },
  { value: '', label: 'Tất cả' },
]

function MovieSection({
  movies,
  isLoading,
  errorMessage,
  searchKeyword,
  onSearchChange,
  genres,
  filters,
  isFiltered,
  dateOptions,
  onFilterChange,
  onResetFilters,
}: MovieSectionProps) {
  const statusTab = STATUS_TABS.find((tab) => tab.value === filters.status)
  const heading = statusTab?.value ? `Phim ${statusTab.label.toLowerCase()}` : 'Tất cả phim'

  return (
    <section className="hp-panel" id="movies">
      <div className="hp-heading">
        <div className="hp-title">
          <span className="hp-step">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
            </svg>
          </span>
          <div>
            <h2>{heading}</h2>
            <p>{isLoading ? 'Đang tải danh sách phim...' : `${movies.length} phim`}</p>
          </div>
        </div>

        <label className="hp-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Tìm tên phim, đạo diễn..."
            value={searchKeyword}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Tìm kiếm phim"
          />
        </label>
      </div>

      <div className="hp-filters">
        <div className="hp-segment" role="group" aria-label="Trạng thái phim">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value || 'all'}
              type="button"
              className={filters.status === tab.value ? 'active' : ''}
              onClick={() => onFilterChange('status', tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          className="hp-select"
          aria-label="Thể loại"
          value={filters.genreId}
          onChange={(event) => onFilterChange('genreId', event.target.value)}
        >
          <option value="">Mọi thể loại</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>

        <select
          className="hp-select"
          aria-label="Ngày chiếu"
          value={filters.date}
          onChange={(event) => onFilterChange('date', event.target.value)}
        >
          <option value="">Mọi ngày chiếu</option>
          {dateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {isFiltered && (
          <button type="button" className="hp-reset" onClick={onResetFilters}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="hp-grid">
          {Array.from({ length: 10 }, (_, index) => (
            <div className="hp-skeleton" key={index} />
          ))}
        </div>
      ) : errorMessage ? (
        <div className="hp-empty hp-empty--error">
          <strong>Không thể tải danh sách phim</strong>
          <span>{errorMessage}</span>
        </div>
      ) : movies.length === 0 ? (
        <div className="hp-empty">
          <strong>Không tìm thấy phim phù hợp</strong>
          <span>
            {searchKeyword.trim()
              ? `Không có phim nào khớp với "${searchKeyword.trim()}".`
              : 'Thử chọn thể loại hoặc ngày chiếu khác.'}
          </span>
        </div>
      ) : (
        <div className="hp-grid">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </section>
  )
}

export default MovieSection
