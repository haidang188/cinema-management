import { useEffect, useRef, useState, type FormEvent } from "react"
import {
  AlertTriangle,
  CalendarDays,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Film,
  Globe2,
  MessageSquareText,
  Play,
  Star,
  Ticket,
  X,
} from "lucide-react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import HomeFooter from "../../component/home/HomeFooter"
import HomeHeader from "../../component/home/HomeHeader"
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
import { formatDate, formatTime } from "../../utils/format"
import "./movie-detail.css"

const SHOWTIMES_ANCHOR = "movie-showtimes"
const DESCRIPTION_CLAMP_CHARS = 220

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
      monthNumber: String(date.getMonth() + 1).padStart(2, "0"),
      label:
        offset + index === 0
          ? "Hôm nay"
          : date.toLocaleDateString("vi-VN", {
              weekday: "short",
            }),
    }
  })
}

function formatLongDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return value
  const text = new Date(year, month - 1, day).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function groupShowtimes(showtimes: ShowtimeData[]) {
  return showtimes.reduce<Record<string, ShowtimeData[]>>((groups, showtime) => {
    const key = showtime.format?.trim() || showtime.roomType?.trim() || "Chưa cập nhật định dạng"

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

function describeAgeRating(ageRating?: string | null) {
  const code = ageRating?.trim().toUpperCase() || ""
  if (code === "P") return "Phổ biến cho mọi đối tượng khán giả"
  if (code === "K") return "Dưới 13 tuổi cần xem cùng cha mẹ hoặc người giám hộ"
  const age = code.match(/\d+/)?.[0]
  if (age) return `Dành cho khán giả từ đủ ${age} tuổi trở lên`
  return "Chưa cập nhật phân loại"
}

function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="md-stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, value - (star - 1)))
        return (
          <span key={star} className="md-stars__item" style={{ width: size, height: size }}>
            <Star size={size} className="md-stars__base" />
            <span className="md-stars__fill" style={{ width: `${fill * 100}%` }}>
              <Star size={size} fill="currentColor" />
            </span>
          </span>
        )
      })}
    </span>
  )
}

interface MovieDetailPageProps {
  currentUser: AuthResponse | null
  onLoginClick: () => void
  onLogout: () => void
}

function MovieDetailPage({ currentUser, onLoginClick, onLogout }: MovieDetailPageProps) {
  const { movieId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

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
  const [reloadKey, setReloadKey] = useState(0)
  const dateOptions = getDateOptions(dateOffset)
  const [selectedShowtimeDate, setSelectedShowtimeDate] = useState(formatDateValue(new Date()))
  const [isDescExpanded, setIsDescExpanded] = useState(false)
  const scrolledForHashRef = useRef("")

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
      .catch((error: { status?: number }) => {
        if (error?.status === 404) {
          setMovie(null)
          setErrorMessage("")
          return
        }
        setErrorMessage("Không thể tải chi tiết phim")
      })
      .finally(() => setIsLoading(false))
  }, [movieId, reloadKey])

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

  // Liên kết "/movies/:id#movie-showtimes" từ các trang khác: cuộn tới lịch chiếu sau khi dữ liệu đã tải xong.
  useEffect(() => {
    if (location.hash !== `#${SHOWTIMES_ANCHOR}`) return
    if (isLoading || isShowtimeLoading || !movie) return

    const scrollKey = `${location.key}:${movieId}`
    if (scrolledForHashRef.current === scrollKey) return
    scrolledForHashRef.current = scrollKey

    const frame = window.requestAnimationFrame(() => revealShowtimes())
    return () => window.cancelAnimationFrame(frame)
  }, [location.hash, location.key, movieId, isLoading, isShowtimeLoading, movie])

  // Lịch chiếu nằm ngay màn hình đầu: chỉ cuộn khi khối lịch chiếu chưa hiển thị trọn vẹn, sau đó nháy viền để gây chú ý.
  function revealShowtimes() {
    const section = document.getElementById(SHOWTIMES_ANCHOR)
    if (!section) return
    const rect = section.getBoundingClientRect()
    const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
    if (!fullyVisible) section.scrollIntoView({ behavior: "smooth", block: "start" })
    section.classList.remove("is-flash")
    void section.offsetWidth
    section.classList.add("is-flash")
  }

  function handleSelectShowtime(showtime: ShowtimeData) {
    if (!currentUser) {
      onLoginClick()
      return
    }
    if (currentUser.role !== "MEMBER") return
    navigate(`/booking/showtimes/${showtime.id}/seats`)
  }

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

  function renderBody() {
    if (isLoading) {
      return (
        <section className="md-hero md-hero--skeleton" aria-busy="true" aria-label="Đang tải chi tiết phim">
          <div className="md-container md-hero__inner">
            <div className="md-skel md-skel--crumb" />
            <div className="md-top">
              <div className="md-skel md-skel--poster md-top__poster" />
              <div className="md-hero__info md-top__info">
                <div className="md-skel md-skel--pill" />
                <div className="md-skel md-skel--title" />
                <div className="md-skel md-skel--line" />
                <div className="md-skel md-skel--text" />
                <div className="md-skel-actions">
                  <div className="md-skel md-skel--button" />
                  <div className="md-skel md-skel--button" />
                </div>
              </div>
              <div className="md-skel md-skel--card md-top__show" />
              <div className="md-skel md-skel--side md-top__side" />
            </div>
          </div>
          <span className="sr-only">Đang tải chi tiết phim...</span>
        </section>
      )
    }

    if (errorMessage || !movie) {
      const isError = Boolean(errorMessage)
      return (
        <div className="md-container md-status">
          <div className="md-status__card" role={isError ? "alert" : "status"}>
            <span className="md-status__icon">{isError ? <AlertTriangle size={28} /> : <Film size={28} />}</span>
            <h1>{isError ? errorMessage : "Không tìm thấy phim"}</h1>
            <p>
              {isError
                ? "Đã có lỗi khi kết nối tới máy chủ. Vui lòng kiểm tra kết nối và thử lại."
                : "Phim bạn tìm có thể đã ngừng chiếu hoặc đường dẫn không còn tồn tại."}
            </p>
            <div className="md-status__actions">
              {isError && (
                <button type="button" className="md-btn md-btn--primary" onClick={() => setReloadKey((value) => value + 1)}>
                  Thử lại
                </button>
              )}
              <Link to="/" className="md-btn md-btn--ghost">Về trang chủ</Link>
            </div>
          </div>
        </div>
      )
    }

    const showtimeGroups = groupShowtimes(showtimes)
    const averageRating = summary?.averageRating ?? 0
    const totalReviews = summary?.totalReviews ?? reviews.length
    const trailerUrl = youtubeEmbedUrl(movie.trailerUrl)
    const genreNames = movie.genres?.map((genre) => genre.name) ?? []
    const description = movie.description?.trim() || ""
    const isLongDescription = description.length > DESCRIPTION_CLAMP_CHARS
    const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((review) => review.rating === star).length,
    }))

    return (
      <>
        <section className="md-hero">
          <div className="md-hero__backdrop" style={{ backgroundImage: `url("${movie.posterUrl}")` }} aria-hidden="true" />
          <div className="md-hero__shade" aria-hidden="true" />

          <div className="md-container md-hero__inner">
            <nav className="md-breadcrumb page-breadcrumb" aria-label="Đường dẫn trang">
              <Link to="/">Phim</Link><span>›</span><Link to="/">Phim đang chiếu</Link><span>›</span><strong>{movie.title}</strong>
            </nav>

            <div className="md-top">
              <div className="md-poster md-top__poster">
                {movie.posterUrl ? <img src={movie.posterUrl} alt={`Poster phim ${movie.title}`} /> : <Film size={40} aria-hidden="true" />}
                {movie.ageRating && <span className="md-age-badge">{movie.ageRating}</span>}
              </div>

              <div className="md-hero__info md-top__info">
                {genreNames.length > 0 && (
                  <ul className="md-genres" aria-label="Thể loại">
                    {genreNames.map((name) => <li key={name}>{name}</li>)}
                  </ul>
                )}

                <h1 className="md-title">{movie.title}</h1>

                <ul className="md-meta">
                  <li><Clock3 size={15} aria-hidden="true" />{movie.durationMinutes} phút</li>
                  {movie.language && <li><Globe2 size={15} aria-hidden="true" />{movie.language}</li>}
                  <li><CalendarDays size={15} aria-hidden="true" />{formatDate(movie.releaseDate)}</li>
                  <li
                    className="md-hero-rating"
                    aria-label={totalReviews > 0 ? `Điểm trung bình ${averageRating.toFixed(1)} trên 5` : "Chưa có đánh giá"}
                  >
                    <StarRow value={averageRating} size={14} />
                    {totalReviews > 0 ? (
                      <>
                        <strong>{averageRating.toFixed(1)}</strong>
                        <span>({totalReviews} đánh giá)</span>
                      </>
                    ) : (
                      <span>Chưa có đánh giá</span>
                    )}
                  </li>
                </ul>

                <div className="md-desc">
                  <p className={`md-hero__desc${isDescExpanded ? " is-expanded" : ""}`}>
                    {description || "Nội dung phim đang được cập nhật."}
                  </p>
                  {isLongDescription && (
                    <button
                      type="button"
                      className="md-desc__toggle"
                      aria-expanded={isDescExpanded}
                      onClick={() => setIsDescExpanded((value) => !value)}
                    >
                      {isDescExpanded ? "Thu gọn" : "Xem thêm"}
                    </button>
                  )}
                </div>

                <div className="md-actions">
                  <button type="button" className="md-btn md-btn--primary" onClick={() => revealShowtimes()}>
                    <Ticket size={17} aria-hidden="true" />Đặt vé ngay
                  </button>
                  <button
                    type="button"
                    className="md-btn md-btn--ghost"
                    disabled={!trailerUrl}
                    title={trailerUrl ? undefined : "Phim chưa có trailer"}
                    onClick={() => setShowTrailer(true)}
                  >
                    <Play size={16} fill="currentColor" aria-hidden="true" />Xem trailer
                  </button>
                </div>
              </div>

              <section className="md-card md-showtimes md-top__show" id={SHOWTIMES_ANCHOR} aria-labelledby="md-showtimes-title">
                <header className="md-card__head">
                  <h2 id="md-showtimes-title">Lịch chiếu</h2>
                  <p>{formatLongDate(selectedShowtimeDate)}</p>
                  <label className="md-date-picker">
                    <CalendarDays size={15} aria-hidden="true" />
                    <span className="sr-only">Chọn ngày chiếu</span>
                    <input
                      type="date"
                      min={formatDateValue(new Date())}
                      value={selectedShowtimeDate}
                      onChange={(event) => event.target.value && setSelectedShowtimeDate(event.target.value)}
                    />
                  </label>
                </header>

                <div className="md-dates">
                  <button
                    className="md-dates__arrow"
                    type="button"
                    aria-label="7 ngày trước"
                    disabled={dateOffset === 0}
                    onClick={() => setDateOffset((value) => Math.max(0, value - 7))}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="md-dates__list">
                    {dateOptions.map((dateOption) => {
                      const isActive = selectedShowtimeDate === dateOption.value
                      return (
                        <button
                          key={dateOption.value}
                          className={`md-date${isActive ? " is-active" : ""}`}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setSelectedShowtimeDate(dateOption.value)}
                        >
                          <span className="md-date__label">{dateOption.label}</span>
                          <strong>{dateOption.day}<span className="md-date__month">/{dateOption.monthNumber}</span></strong>
                        </button>
                      )
                    })}
                  </div>
                  <button
                    className="md-dates__arrow"
                    type="button"
                    aria-label="7 ngày tiếp theo"
                    onClick={() => setDateOffset((value) => value + 7)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {isShowtimeLoading && (
                  <div className="md-times-skeleton" aria-label="Đang tải lịch chiếu...">
                    {Array.from({ length: 6 }, (_, index) => <div key={index} className="md-skel md-skel--time" />)}
                  </div>
                )}
                {!isShowtimeLoading && showtimeError && (
                  <p className="md-inline-error" role="alert"><AlertTriangle size={16} aria-hidden="true" />{showtimeError}</p>
                )}
                {!isShowtimeLoading && !showtimeError && showtimes.length === 0 && (
                  <div className="md-empty">
                    <span className="md-empty__icon"><CalendarX2 size={20} aria-hidden="true" /></span>
                    <div>
                      <strong>Chưa có lịch chiếu cho ngày này</strong>
                      <p>Vui lòng chọn một ngày khác để xem suất chiếu.</p>
                    </div>
                  </div>
                )}
                {!isShowtimeLoading && !showtimeError && showtimes.length > 0 && (
                  <div className="md-showtime-groups">
                    {Object.entries(showtimeGroups).map(([groupKey, groupItems]) => (
                      <article key={groupKey} className="md-showtime-group">
                        <div className="md-showtime-group__head">
                          <span className="md-format-tag">{groupKey}</span>
                          <span>{groupItems.length} suất</span>
                        </div>
                        <div className="md-times">
                          {groupItems.map((showtime) => (
                            <button
                              key={showtime.id}
                              type="button"
                              className="md-time"
                              title={`Còn ${showtime.availableSeats}/${showtime.totalSeats} ghế`}
                              onClick={() => handleSelectShowtime(showtime)}
                            >
                              <span className="md-time__clock">
                                <strong>{formatTime(showtime.startTime)}</strong>
                                {showtime.endTime && <span>~{formatTime(showtime.endTime)}</span>}
                              </span>
                              <small>Còn {showtime.availableSeats} ghế</small>
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <aside className="md-side md-top__side">
                <section className="md-card md-info" aria-labelledby="md-info-title">
                  <header className="md-card__head">
                    <h2 id="md-info-title">Thông tin phim</h2>
                  </header>
                  <dl>
                    <div><dt>Đạo diễn</dt><dd>{movie.director || "Đang cập nhật"}</dd></div>
                    <div><dt>Diễn viên</dt><dd className="md-info__clamp" title={movie.cast || undefined}>{movie.cast || "Đang cập nhật"}</dd></div>
                    <div>
                      <dt>Thể loại</dt>
                      <dd>{genreNames.length > 0 ? genreNames.join(", ") : "Đang cập nhật"}</dd>
                    </div>
                    <div><dt>Ngôn ngữ</dt><dd>{movie.language || "Đang cập nhật"}</dd></div>
                    <div><dt>Thời lượng</dt><dd>{movie.durationMinutes} phút</dd></div>
                    <div><dt>Khởi chiếu</dt><dd>{formatDate(movie.releaseDate)}</dd></div>
                    <div>
                      <dt>Phân loại</dt>
                      <dd>
                        {movie.ageRating && <span className="md-meta__age">{movie.ageRating}</span>}
                        <span className="md-info__note">{describeAgeRating(movie.ageRating)}</span>
                      </dd>
                    </div>
                  </dl>
                </section>
              </aside>
            </div>
          </div>
        </section>

        <div className="md-container md-below">
          <section className="md-card md-reviews" aria-labelledby="md-reviews-title">
            <header className="md-card__head">
              <h2 id="md-reviews-title">Đánh giá khán giả</h2>
            </header>

            <div className="md-reviews__grid">
              <div className="md-reviews__aside">
                <div className="md-rating-summary">
                  <div className="md-rating-summary__score">
                    <strong>{averageRating.toFixed(1)}</strong>
                    <StarRow value={averageRating} size={14} />
                    <span>{totalReviews} đánh giá</span>
                  </div>
                  <ul className="md-rating-bars" aria-label="Phân bố số sao">
                    {ratingBreakdown.map(({ star, count }) => (
                      <li key={star}>
                        <span>{star}<Star size={10} fill="currentColor" aria-hidden="true" /></span>
                        <div className="md-rating-bars__track">
                          <div style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : "0%" }} />
                        </div>
                        <em>{count}</em>
                      </li>
                    ))}
                  </ul>
                </div>

                {canReview && (
                  <form className="md-review-form" onSubmit={handleSubmitReview}>
                    <fieldset>
                      <legend>Bạn chấm phim này mấy sao?</legend>
                      <div className="md-star-picker" role="radiogroup" aria-label="Số sao đánh giá">
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
                            <Star size={22} fill="currentColor" />
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <textarea
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      placeholder="Viết cảm nhận của bạn..."
                    />

                    {reviewError && <p className="md-inline-error" role="alert">{reviewError}</p>}

                    <button type="submit" className="md-btn md-btn--primary" disabled={isSubmittingReview}>
                      {isSubmittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                    </button>
                  </form>
                )}
              </div>

              <div className="md-review-list">
                {reviews.length === 0 && (
                  <div className="md-empty">
                    <span className="md-empty__icon"><MessageSquareText size={20} aria-hidden="true" /></span>
                    <div>
                      <strong>Hiện chưa có đánh giá nào</strong>
                      <p>Hãy là người đầu tiên chia sẻ cảm nhận sau khi xem phim.</p>
                    </div>
                  </div>
                )}
                {reviews.map((review) => (
                  <article key={review.id} className="md-review">
                    <span className="md-review__avatar" aria-hidden="true">
                      {(review.reviewerName || "?").trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="md-review__body">
                      <div className="md-review__head">
                        <strong>{review.reviewerName}</strong>
                        <span className="md-review__stars" aria-label={`${review.rating} trên 5 sao`}>
                          <StarRow value={review.rating} size={12} />
                        </span>
                        <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
                      </div>
                      {review.content && <p>{review.content}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>

        {showTrailer && (
          <div
            className="md-trailer"
            role="dialog"
            aria-modal="true"
            aria-label={`Trailer ${movie.title}`}
            onMouseDown={() => setShowTrailer(false)}
          >
            <div className="md-trailer__dialog" onMouseDown={(event) => event.stopPropagation()}>
              <header>
                <div><span>Trailer chính thức</span><h2>{movie.title}</h2></div>
                <button type="button" onClick={() => setShowTrailer(false)} aria-label="Đóng trailer"><X size={18} /></button>
              </header>
              <div className="md-trailer__video">
                <iframe src={trailerUrl} title={`Trailer ${movie.title}`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <main className="home-page customer-shell md-page">
      <HomeHeader currentUser={currentUser} onLoginClick={onLoginClick} onLogout={onLogout} />
      {renderBody()}
      <HomeFooter />
    </main>
  )
}

export default MovieDetailPage
