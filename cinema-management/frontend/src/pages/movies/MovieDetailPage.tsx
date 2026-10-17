import { useEffect, useState, type FormEvent } from "react"
import { CalendarDays, CalendarX2, ChevronLeft, ChevronRight, Star, X } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { getPublicMovie } from "../../service/movie/movieService"
import {
  createMovieReview,
  getMovieReviewEligibility,
  getMovieRatingSummary,
  getMovieReviews,
} from "../../service/movie/movieReviewService"
import { getShowtimesByMovieAndDate } from "../../service/showtime/showtimeService"
import type { AuthResponse } from "../../types/auth"
import type { Movie } from "../../types/movie"
import type { MovieRatingSummary, MovieReview } from "../../types/review"
import type { ShowtimeData } from "../../types/showtime/showtime"

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function getDateOptions(offset: number) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + offset + index)

    return {
      value: formatDateValue(date),
      day: String(date.getDate()).padStart(2, "0"),
      label:
        offset + index === 0
          ? "Hôm nay"
          : date.toLocaleDateString("vi-VN", {
              weekday: "short",
            }),
    }
  })
}

function formatShowtimeTime(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function groupShowtimes(showtimes: ShowtimeData[]) {
  return showtimes.reduce<Record<string, ShowtimeData[]>>((groups, showtime) => {
    const key = showtime.format?.trim() || "Chưa cập nhật định dạng"

    groups[key] = groups[key] || []
    groups[key].push(showtime)

    return groups
  }, {})
}

function youtubeEmbedUrl(url?: string | null) {
  if (!url) return ""
  try {
    const parsed = new URL(url)
    let videoId = ""
    if (parsed.hostname.includes("youtu.be")) videoId = parsed.pathname.split("/").filter(Boolean)[0] || ""
    else if (parsed.pathname.startsWith("/embed/") || parsed.pathname.startsWith("/shorts/")) videoId = parsed.pathname.split("/")[2] || ""
    else videoId = parsed.searchParams.get("v") || ""
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : ""
  } catch {
    return ""
  }
}

interface MovieDetailPageProps {
  currentUser: AuthResponse | null
  onLoginClick: () => void
}

function MovieDetailPage({ currentUser, onLoginClick }: MovieDetailPageProps) {
  const { movieId } = useParams()
  const navigate = useNavigate()

  const [movie, setMovie] = useState<Movie | null>(null)
  const [reviews, setReviews] = useState<MovieReview[]>([])
  const [summary, setSummary] = useState<MovieRatingSummary | null>(null)
  const [showtimes, setShowtimes] = useState<ShowtimeData[]>([])
  const [canReview, setCanReview] = useState(false)
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [showtimeError, setShowtimeError] = useState("")
  const [reviewError, setReviewError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isShowtimeLoading, setIsShowtimeLoading] = useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [showTrailer, setShowTrailer] = useState(false)
  const [dateOffset, setDateOffset] = useState(0)
  const dateOptions = getDateOptions(dateOffset)
  const [selectedShowtimeDate, setSelectedShowtimeDate] = useState(formatDateValue(new Date()))

  useEffect(() => {
    if (!movieId) return

    setIsLoading(true)
    Promise.all([getPublicMovie(movieId), getMovieReviews(movieId), getMovieRatingSummary(movieId)])
      .then(([movieData, reviewData, summaryData]) => {
        setMovie(movieData)
        setReviews(reviewData)
        setSummary(summaryData)
        setErrorMessage("")
      })
      .catch(() => setErrorMessage("Không thể tải chi tiết phim"))
      .finally(() => setIsLoading(false))
  }, [movieId])

  useEffect(() => {
    if (!movieId) return

    setIsShowtimeLoading(true)
    getShowtimesByMovieAndDate(movieId, selectedShowtimeDate)
      .then((data) => {
        setShowtimes(data)
        setShowtimeError("")
      })
      .catch(() => setShowtimeError("Không thể tải lịch chiếu phim"))
      .finally(() => setIsShowtimeLoading(false))
  }, [movieId, selectedShowtimeDate])

  useEffect(() => {
    if (!movieId || !currentUser) {
      setCanReview(false)
      return
    }

    getMovieReviewEligibility(movieId, currentUser.userId)
      .then((data) => setCanReview(data.canReview))
      .catch(() => setCanReview(false))
  }, [movieId, currentUser])

  function handleSubmitReview(event: FormEvent) {
    event.preventDefault()

    if (!movieId) return

    if (!currentUser) {
      onLoginClick()
      return
    }

    setIsSubmittingReview(true)
    setReviewError("")

    createMovieReview(movieId, currentUser.userId, {
      rating,
      content,
    })
      .then((savedReview) => {
        setReviews((currentReviews) => [
          savedReview,
          ...currentReviews.filter((review) => review.userId !== savedReview.userId),
        ])
        setContent("")
        setCanReview(false)

        return getMovieRatingSummary(movieId).then(setSummary)
      })
      .catch(() => setReviewError("Không thể gửi đánh giá. Vui lòng thử lại."))
      .finally(() => setIsSubmittingReview(false))
  }

  if (isLoading) {
    return <main className="movie-detail-page">Đang tải chi tiết phim...</main>
  }

  if (errorMessage) {
    return <main className="movie-detail-page">{errorMessage}</main>
  }

  if (!movie) {
    return <main className="movie-detail-page">Không tìm thấy phim.</main>
  }

  const showtimeGroups = groupShowtimes(showtimes)
  const averageRating = summary?.averageRating ?? 0

  return (
    <main className="movie-detail-page">
      <div className="movie-detail-content movie-detail-shell">
      <div className="movie-detail-left">
      <section className="movie-detail-hero">
        <div className="movie-detail-poster-panel">
          <nav className="movie-detail-breadcrumb page-breadcrumb" aria-label="Đường dẫn trang">
            <Link to="/">Phim</Link><span>›</span><Link to="/">Phim đang chiếu</Link><span>›</span><strong>Chi tiết phim</strong>
          </nav>
          <div className="movie-detail-poster-frame">
            <span className="movie-age-badge">{movie.ageRating}</span>
            <div className="movie-detail-poster">
              <img src={movie.posterUrl} alt={movie.title} />
            </div>
          </div>
        </div>

        <div className="movie-detail-info">
          <p className="movie-detail-genres">{movie.genres?.map((genre) => genre.name).join(" - ")}</p>

          <h1>{movie.title}</h1>

          <div className="movie-detail-meta">
            <span>{movie.durationMinutes} phút</span>
            <span>{movie.releaseDate}</span>
            <span>{averageRating.toFixed(1)} sao</span>
          </div>

          <div className="movie-detail-actions">
            <button className="movie-trailer-button" type="button" disabled={!youtubeEmbedUrl(movie.trailerUrl)} onClick={() => setShowTrailer(true)}>Xem trailer</button>
            <button type="button" onClick={() => document.getElementById("movie-showtimes")?.scrollIntoView({ behavior: "smooth" })}>Đặt vé ngay</button>
          </div>

          <h2>Nội Dung Phim</h2>
          <p>{movie.description}</p>

          <div className="movie-detail-extra">
            <div>
              <strong>Đạo diễn</strong>
              <span>{movie.director}</span>
            </div>
            <div>
              <strong>Diễn viên</strong>
              <span>{movie.cast}</span>
            </div>
            <div>
              <strong>Ngôn ngữ</strong>
              <span>{movie.language}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="movie-detail-grid">
        <div className="movie-detail-showtimes" id="movie-showtimes">
          <div className="movie-detail-section-head">
            <h2>Lịch Chiếu Phim</h2>
            <label className="movie-date-picker"><CalendarDays size={17} /><span>Chọn ngày</span><input type="date" min={formatDateValue(new Date())} value={selectedShowtimeDate} onChange={event => setSelectedShowtimeDate(event.target.value)} /></label>
          </div>
          <div className="movie-detail-date-tabs">
            <button className="date-arrow" type="button" disabled={dateOffset === 0} onClick={() => setDateOffset(value => Math.max(0, value - 7))}><ChevronLeft /></button>
            {dateOptions.map((dateOption) => (
              <button
                key={dateOption.value}
                className={selectedShowtimeDate === dateOption.value ? "is-active" : ""}
                type="button"
                onClick={() => setSelectedShowtimeDate(dateOption.value)}
              >
                <span>{dateOption.label}</span>
                <strong>{dateOption.day}</strong>
              </button>
            ))}
            <button className="date-arrow" type="button" onClick={() => setDateOffset(value => value + 7)}><ChevronRight /></button>
          </div>

          {isShowtimeLoading && <p className="movie-state">Đang tải lịch chiếu...</p>}
          {showtimeError && <p className="movie-state movie-state--error">{showtimeError}</p>}
          {!isShowtimeLoading && !showtimeError && showtimes.length === 0 && (
            <div className="movie-showtime-empty">
              <CalendarX2 size={30} aria-hidden="true" />
              <p>Chưa có lịch chiếu cho ngày này.</p>
            </div>
          )}
          {!isShowtimeLoading && !showtimeError && showtimes.length > 0 && (
            <div className="movie-detail-showtime-list">
              {Object.entries(showtimeGroups).map(([groupKey, groupShowtimes]) => {
                const format = groupKey

                return (
                  <article key={groupKey} className="movie-detail-showtime-group">
                    <div className="movie-detail-showtime-group-head">
                      <strong>{format}</strong>
                    </div>
                    <div className="movie-detail-showtime-times">
                      {groupShowtimes.map((showtime) => (
                        <button
                          key={showtime.id}
                          type="button"
                          title={showtime.roomName}
                          onClick={() => {
                            if (!currentUser) {
                              onLoginClick()
                              return
                            }
                            if (currentUser.role !== "MEMBER") return
                            navigate(`/booking/showtimes/${showtime.id}/seats`)
                          }}
                        >
                          {formatShowtimeTime(showtime.startTime)}
                        </button>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

      </section>
      </div>

        <aside className="movie-review-panel">
          <div className="movie-review-head">
            <h2>Đánh Giá Khán Giả</h2>
          </div>

          <div className="rating-summary">
            <div className="rating-score">
              <strong>{averageRating.toFixed(1)}</strong>
              <span>/5.0</span>
            </div>
          </div>

          <div className="review-list">
            {reviews.length === 0 && <p className="review-empty">Hiện chưa có đánh giá nào.</p>}
            {reviews.map((review) => (
              <article key={review.id} className="review-item">
                <div>
                  <strong>{review.reviewerName}</strong>
                  <span aria-label={`${review.rating} trên 5 sao`}>{"★".repeat(review.rating)}</span>
                </div>
                {review.content && <p>{review.content}</p>}
              </article>
            ))}
          </div>

          {canReview && (
            <form className="review-form" onSubmit={handleSubmitReview}>
              <fieldset className="review-star-field">
                <legend>Chọn số sao</legend>
                <div className="review-star-picker" role="radiogroup" aria-label="Số sao đánh giá">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={rating === star}
                      aria-label={`${star} sao`}
                      className={star <= rating ? "is-selected" : undefined}
                      onClick={() => setRating(star)}
                    >
                      <Star size={24} fill="currentColor" />
                    </button>
                  ))}
                </div>
              </fieldset>

              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Viết cảm nhận của bạn..."
              />

              {reviewError && <p className="movie-state movie-state--error">{reviewError}</p>}

              <button type="submit" disabled={isSubmittingReview}>
                {isSubmittingReview ? "Đang gửi..." : "Viết đánh giá"}
              </button>
            </form>
          )}
        </aside>
      </div>
      {showTrailer && <div className="trailer-modal" role="dialog" aria-modal="true" aria-label={`Trailer ${movie.title}`} onMouseDown={() => setShowTrailer(false)}>
        <div className="trailer-modal__dialog" onMouseDown={event => event.stopPropagation()}>
          <header><div><span>TRAILER CHÍNH THỨC</span><h2>{movie.title}</h2></div><button type="button" onClick={() => setShowTrailer(false)} aria-label="Đóng trailer"><X /></button></header>
          <div className="trailer-modal__video"><iframe src={youtubeEmbedUrl(movie.trailerUrl)} title={`Trailer ${movie.title}`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>
        </div>
      </div>}
    </main>
  )
}

export default MovieDetailPage
