import { useEffect, useMemo, useRef, useState } from "react"
import { getGenres } from "../../service/movie/movieService"
import type { AdminMovie, ApiRequestError, Genre, MovieFormValues, MoviePayload } from "../../types/admin"

const STATUSES = [
  { value: "UPCOMING", label: "Sắp chiếu" },
  { value: "SHOWING", label: "Đang chiếu" },
  { value: "ENDED", label: "Đã kết thúc" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
]

const EMPTY_MOVIE: MovieFormValues = {
  title: "",
  description: "",
  durationMinutes: "",
  releaseDate: "",
  ageRating: "",
  director: "",
  cast: "",
  language: "",
  posterUrl: "",
  trailerUrl: "",
  status: "UPCOMING",
  genreIds: [],
}

interface MovieFormProps {
  initialMovie?: AdminMovie | null
  submitLabel: string
  onSubmit: (payload: MoviePayload) => Promise<void>
  onCancel: () => void
}

function normalizeInitialMovie(movie?: AdminMovie | null): MovieFormValues {
  if (!movie) {
    return EMPTY_MOVIE
  }

  return {
    title: movie.title || "",
    description: movie.description || "",
    durationMinutes: movie.durationMinutes || "",
    releaseDate: movie.releaseDate || "",
    ageRating: movie.ageRating || "",
    director: movie.director || "",
    cast: movie.cast || "",
    language: movie.language || "",
    posterUrl: movie.posterUrl || "",
    trailerUrl: movie.trailerUrl || "",
    status: movie.status || "UPCOMING",
    genreIds: movie.genres?.map((genre) => genre.id) || [],
  }
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return ["http:", "https:"].includes(url.protocol)
  } catch {
    return false
  }
}

function validatePosterUrl(value: string, requiresPoster: boolean): string {
  const posterUrl = value.trim()
  if (!posterUrl) {
    return requiresPoster ? "Vui lòng nhập link poster Cloudinary" : ""
  }

  if (posterUrl.length > 255) {
    return "Link poster tối đa 255 ký tự"
  }

  if (!isValidUrl(posterUrl)) {
    return "Link poster không hợp lệ"
  }

  if (!new URL(posterUrl).hostname.includes("cloudinary.com")) {
    return "Vui lòng dùng link ảnh từ Cloudinary"
  }

  return ""
}

function validate(values: MovieFormValues, requiresPoster: boolean): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!values.title.trim()) {
    errors.title = "Tên phim không được để trống"
  } else if (values.title.length > 150) {
    errors.title = "Tên phim tối đa 150 ký tự"
  }

  const duration = Number(values.durationMinutes)
  if (!values.durationMinutes) {
    errors.durationMinutes = "Vui lòng nhập thời lượng"
  } else if (!Number.isInteger(duration) || duration <= 0) {
    errors.durationMinutes = "Thời lượng phải lớn hơn 0"
  }

  if (values.ageRating.length > 10) errors.ageRating = "Tối đa 10 ký tự"
  if (values.director.length > 100) errors.director = "Tối đa 100 ký tự"
  if (values.language.length > 50) errors.language = "Tối đa 50 ký tự"
  if (values.trailerUrl.length > 255) errors.trailerUrl = "Tối đa 255 ký tự"

  const posterError = validatePosterUrl(values.posterUrl, requiresPoster)
  if (posterError) errors.posterUrl = posterError

  return errors
}

function MovieForm({ initialMovie, submitLabel, onSubmit, onCancel }: MovieFormProps) {
  const [values, setValues] = useState(() => normalizeInitialMovie(initialMovie))
  const [genres, setGenres] = useState<Genre[]>([])
  const [genreError, setGenreError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const formRef = useRef<HTMLFormElement | null>(null)
  const requiresPoster = !initialMovie

  useEffect(() => {
    setValues(normalizeInitialMovie(initialMovie))
  }, [initialMovie])

  useEffect(() => {
    let ignore = false
    getGenres()
      .then((data) => {
        if (!ignore) setGenres(data)
      })
      .catch((error) => {
        if (!ignore) setGenreError(error.message)
      })
    return () => {
      ignore = true
    }
  }, [])

  const posterPreview = useMemo(() => values.posterUrl.trim(), [values.posterUrl])
  const canOpenTrailer = isValidUrl(values.trailerUrl)

  function updateField<K extends keyof MovieFormValues>(name: K, value: MovieFormValues[K]) {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: "" }))
  }

  function toggleGenre(genreId: number) {
    setValues((current) => {
      const selected = current.genreIds.includes(genreId)
      return {
        ...current,
        genreIds: selected
          ? current.genreIds.filter((id) => id !== genreId)
          : [...current.genreIds, genreId],
      }
    })
  }

  function focusFirstInvalidField(validationErrors: Record<string, string>) {
    const firstField = Object.keys(validationErrors)[0]
    const element = formRef.current?.querySelector<HTMLElement>(`[data-field="${firstField}"]`)
    element?.focus()
    element?.scrollIntoView({ block: "center", behavior: "smooth" })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const validationErrors = validate(values, requiresPoster)
    setErrors(validationErrors)
    setSubmitError("")

    if (Object.keys(validationErrors).length > 0) {
      focusFirstInvalidField(validationErrors)
      return
    }

    const payload: MoviePayload = {
      ...values,
      title: values.title.trim(),
      posterUrl: values.posterUrl.trim(),
      durationMinutes: Number(values.durationMinutes),
      genreIds: values.genreIds,
    }

    setSaving(true)
    try {
      await onSubmit(payload)
    } catch (error) {
      const requestError = error as ApiRequestError
      setSubmitError(requestError.message)
      setErrors(requestError.fieldErrors || {})
    } finally {
      setSaving(false)
    }
  }

  return (
    <form ref={formRef} className="movie-form movie-admin-form" onSubmit={handleSubmit} noValidate>
      {submitError && <div className="movie-alert movie-alert-error">{submitError}</div>}

      <div className="form-actions movie-action-bar movie-action-bar-top">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Quay lại
        </button>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? "Đang lưu..." : submitLabel}
        </button>
      </div>

      <section className="form-panel movie-form-section">
        <div className="panel-heading">
          <h2>Thông tin cơ bản</h2>
        </div>

        <div className="movie-form-grid">
          <label className="movie-field movie-field-full">
            <span>Tên phim *</span>
            <input
              data-field="title"
              className={errors.title ? "is-invalid" : ""}
              type="text"
              value={values.title}
              onChange={(event) => updateField("title", event.target.value)}
              maxLength={150}
              required
            />
            {errors.title && <small>{errors.title}</small>}
          </label>

          <label className="movie-field">
            <span>Ngày phát hành</span>
            <input
              type="date"
              value={values.releaseDate}
              onChange={(event) => updateField("releaseDate", event.target.value)}
            />
          </label>

          <label className="movie-field">
            <span>Thời lượng *</span>
            <input
              data-field="durationMinutes"
              className={errors.durationMinutes ? "is-invalid" : ""}
              type="number"
              min="1"
              value={values.durationMinutes}
              onChange={(event) => updateField("durationMinutes", event.target.value)}
              required
            />
            {errors.durationMinutes && <small>{errors.durationMinutes}</small>}
          </label>

          <label className="movie-field">
            <span>Giới hạn tuổi</span>
            <input
              className={errors.ageRating ? "is-invalid" : ""}
              type="text"
              value={values.ageRating}
              onChange={(event) => updateField("ageRating", event.target.value)}
              maxLength={10}
            />
            {errors.ageRating && <small>{errors.ageRating}</small>}
          </label>

          <label className="movie-field">
            <span>Ngôn ngữ</span>
            <input
              className={errors.language ? "is-invalid" : ""}
              type="text"
              value={values.language}
              onChange={(event) => updateField("language", event.target.value)}
              maxLength={50}
            />
            {errors.language && <small>{errors.language}</small>}
          </label>

          <label className="movie-field">
            <span>Trạng thái</span>
            <select value={values.status} onChange={(event) => updateField("status", event.target.value)}>
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="form-panel movie-form-section">
        <div className="panel-heading">
          <h2>Thông tin sản xuất</h2>
        </div>

        <div className="movie-form-grid">
          <label className="movie-field">
            <span>Đạo diễn</span>
            <input
              className={errors.director ? "is-invalid" : ""}
              type="text"
              value={values.director}
              onChange={(event) => updateField("director", event.target.value)}
              maxLength={100}
            />
            {errors.director && <small>{errors.director}</small>}
          </label>

          <label className="movie-field">
            <span>Diễn viên</span>
            <input type="text" value={values.cast} onChange={(event) => updateField("cast", event.target.value)} />
          </label>
        </div>

        <div className="movie-genre-section">
          <span className="field-title">Thể loại</span>
          {genreError && <div className="movie-alert movie-alert-error">{genreError}</div>}
          <div className="genre-options movie-genre-options">
            {genres.map((genre) => (
              <label key={genre.id} className="checkbox-pill">
                <input
                  type="checkbox"
                  checked={values.genreIds.includes(genre.id)}
                  onChange={() => toggleGenre(genre.id)}
                />
                <span>{values.genreIds.includes(genre.id) ? "✓ " : ""}{genre.name}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="form-panel movie-form-section">
        <div className="panel-heading">
          <h2>Media</h2>
        </div>

        <div className="movie-media-grid movie-media-grid-url">
          <label className="movie-field movie-field-full">
            <span>Link poster Cloudinary {requiresPoster ? "*" : ""}</span>
            <input
              data-field="posterUrl"
              className={errors.posterUrl ? "is-invalid" : ""}
              type="url"
              value={values.posterUrl}
              onChange={(event) => updateField("posterUrl", event.target.value)}
              placeholder="https://res.cloudinary.com/..."
              maxLength={255}
              required={requiresPoster}
            />
            {errors.posterUrl && <small>{errors.posterUrl}</small>}
          </label>

          <div className="poster-frame">
            <div className="poster-preview">
              {posterPreview ? <img src={posterPreview} alt="Poster preview" /> : <span>Xem trước poster</span>}
            </div>
          </div>

          <label className="movie-field movie-field-full">
            <span>Trailer URL</span>
            <div className="trailer-input-row">
              <input
                className={errors.trailerUrl ? "is-invalid" : ""}
                type="url"
                value={values.trailerUrl}
                onChange={(event) => updateField("trailerUrl", event.target.value)}
                placeholder="https://youtube.com/..."
              />
              <button
                type="button"
                className="secondary-button"
                disabled={!canOpenTrailer}
                onClick={() => window.open(values.trailerUrl, "_blank", "noopener,noreferrer")}
              >
                Mở
              </button>
            </div>
            {errors.trailerUrl && <small>{errors.trailerUrl}</small>}
          </label>
        </div>
      </section>

      <section className="form-panel movie-form-section">
        <div className="panel-heading">
          <h2>Nội dung</h2>
        </div>
        <label className="movie-field">
          <span>Mô tả</span>
          <textarea
            value={values.description}
            onChange={(event) => updateField("description", event.target.value)}
            rows={8}
          />
        </label>
      </section>
    </form>
  )
}

export default MovieForm
