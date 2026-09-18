import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getPublicMovie } from "../../service/movie/movieService"
import {
  createOrUpdateMovieReview,
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

function getRemainingWeekDays() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const remainingDays = dayOfWeek === 0 ? 1 : 8 - dayOfWeek

  return Array.from({ length: remainingDays }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)

    return {
      value: formatDateValue(date),
      day: String(date.getDate()).padStart(2, "0"),
      label:
        index === 0
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
    const roomName = showtime.roomName || "Phòng chiếu"
    const format = showtime.format || "2D"
    const key = `${roomName}__${format}`

    groups[key] = groups[key] || []
    groups[key].push(showtime)

    return groups
  }, {})
}

function getRatingDistribution(reviews: MovieReview[]) {
  return [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((review) => review.rating === star).length
    const percent = reviews.length ? Math.round((count / reviews.length) * 100) : 0

    return { star, count, percent }
  })
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
  const dateOptions = getRemainingWeekDays()
  const [selectedShowtimeDate, setSelectedShowtimeDate] = useState(dateOptions[0].value)

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

    createOrUpdateMovieReview(movieId, currentUser.userId, {
      rating,
      content,
    })
      .then((savedReview) => {
        setReviews((currentReviews) => [
          savedReview,
          ...currentReviews.filter((review) => review.userId !== savedReview.userId),
        ])
        setContent("")

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
  const ratingDistribution = getRatingDistribution(reviews)
  const averageRating = summary?.averageRating ?? 0
  const totalReviews = summary?.totalReviews ?? 0

  return (
    <main className="movie-detail-page">
      <section className="movie-detail-hero movie-detail-shell">
        <div className="movie-detail-poster-panel">
          <div className="movie-detail-poster-head">
            <button className="detail-back-button" type="button" onClick={() => navigate("/")}>
              Chi tiết phim
            </button>
            <span>{movie.ageRating}</span>
          </div>
          <div className="movie-detail-poster">
            <img src={movie.posterUrl} alt={movie.title} />
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
            <a href={movie.trailerUrl} target="_blank" rel="noreferrer">
              Xem trailer
            </a>
            <button type="button">Đặt vé ngay</button>
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

      <section className="movie-detail-grid movie-detail-shell">
        <div className="movie-detail-showtimes">
          <div className="movie-detail-section-head">
            <h2>Lịch Chiếu Phim</h2>
            <span>{selectedShowtimeDate}</span>
          </div>
          <div className="movie-detail-date-tabs">
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
          </div>

          {isShowtimeLoading && <p className="movie-state">Đang tải lịch chiếu...</p>}
          {showtimeError && <p className="movie-state movie-state--error">{showtimeError}</p>}
          {!isShowtimeLoading && !showtimeError && showtimes.length === 0 && (
            <p className="movie-state">Chưa có lịch chiếu cho ngày này.</p>
          )}
          {!isShowtimeLoading && !showtimeError && showtimes.length > 0 && (
            <div className="movie-detail-showtime-list">
              {Object.entries(showtimeGroups).map(([groupKey, groupShowtimes]) => {
                const [roomName, format] = groupKey.split("__")

                return (
                  <article key={groupKey} className="movie-detail-showtime-group">
                    <div className="movie-detail-showtime-group-head">
                      <strong>{roomName}</strong>
                      <span>{format}</span>
                    </div>
                    <div className="movie-detail-showtime-times">
                      {groupShowtimes.map((showtime) => (
                        <button key={showtime.id} type="button">
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

        <aside className="movie-review-panel">
          <div className="movie-review-head">
            <h2>Đánh Giá Khán Giả</h2>
            <span>{totalReviews} lượt</span>
          </div>

          <div className="rating-summary">
            <div className="rating-score">
              <strong>{averageRating.toFixed(1)}</strong>
              <span>/5</span>
            </div>
            <div className="rating-stars" aria-label={`${averageRating.toFixed(1)} trên 5 sao`}>
              ★★★★★
            </div>
            <p>{totalReviews} lượt đánh giá</p>
            <div className="rating-bars">
              {ratingDistribution.map((item) => (
                <div key={item.star} className="rating-bar-row">
                  <span>{item.star}</span>
                  <div>
                    <i style={{ width: `${item.percent}%` }} />
                  </div>
                  <small>{item.percent}%</small>
                </div>
              ))}
            </div>
          </div>

          {canReview && (
            <form className="review-form" onSubmit={handleSubmitReview}>
              <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                <option value={5}>5 sao</option>
                <option value={4}>4 sao</option>
                <option value={3}>3 sao</option>
                <option value={2}>2 sao</option>
                <option value={1}>1 sao</option>
              </select>

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

          <div className="review-list">
            {reviews.length === 0 && <p className="review-empty">Hiện chưa có đánh giá nào.</p>}
            {reviews.map((review) => (
              <article key={review.id} className="review-item">
                <div>
                  <strong>{review.reviewerName}</strong>
                  <span>{"★".repeat(review.rating)}</span>
                </div>
                {review.content && <p>{review.content}</p>}
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  )
}

export default MovieDetailPage
