import { useEffect, useMemo, useState } from 'react'
import { getGenres } from '../../services/movieService.js'

const MAX_POSTER_SIZE = 5 * 1024 * 1024
const ALLOWED_POSTER_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const STATUSES = [
  { value: 'UPCOMING', label: 'Sắp chiếu' },
  { value: 'SHOWING', label: 'Đang chiếu' },
  { value: 'ENDED', label: 'Đã kết thúc' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động' },
]

const EMPTY_MOVIE = {
  title: '',
  description: '',
  durationMinutes: '',
  releaseDate: '',
  ageRating: '',
  director: '',
  cast: '',
  language: '',
  posterUrl: '',
  trailerUrl: '',
  status: 'UPCOMING',
  genreIds: [],
}

function normalizeInitialMovie(movie) {
  if (!movie) {
    return EMPTY_MOVIE
  }

  return {
    title: movie.title || '',
    description: movie.description || '',
    durationMinutes: movie.durationMinutes || '',
    releaseDate: movie.releaseDate || '',
    ageRating: movie.ageRating || '',
    director: movie.director || '',
    cast: movie.cast || '',
    language: movie.language || '',
    posterUrl: movie.posterUrl || '',
    trailerUrl: movie.trailerUrl || '',
    status: movie.status || 'UPCOMING',
    genreIds: movie.genres?.map((genre) => genre.id) || [],
  }
}

function validatePosterFile(file) {
  if (!file) {
    return ''
  }

  if (!ALLOWED_POSTER_TYPES.includes(file.type)) {
    return 'Ảnh poster chỉ hỗ trợ JPG, PNG hoặc WebP'
  }

  if (file.size > MAX_POSTER_SIZE) {
    return 'Ảnh poster không được vượt quá 5MB'
  }

  return ''
}

function validate(values, posterFile, requiresPoster) {
  const errors = {}
  if (!values.title.trim()) {
    errors.title = 'Vui lòng nhập tên phim'
  } else if (values.title.length > 150) {
    errors.title = 'Tên phim tối đa 150 ký tự'
  }

  const duration = Number(values.durationMinutes)
  if (!values.durationMinutes) {
    errors.durationMinutes = 'Vui lòng nhập thời lượng'
  } else if (!Number.isInteger(duration) || duration <= 0) {
    errors.durationMinutes = 'Thời lượng phải lớn hơn 0'
  }

  if (values.ageRating.length > 10) errors.ageRating = 'Tối đa 10 ký tự'
  if (values.director.length > 100) errors.director = 'Tối đa 100 ký tự'
  if (values.language.length > 50) errors.language = 'Tối đa 50 ký tự'
  if (values.trailerUrl.length > 255) errors.trailerUrl = 'Tối đa 255 ký tự'

  const posterError = validatePosterFile(posterFile)
  if (posterError) {
    errors.poster = posterError
  } else if (requiresPoster && !posterFile) {
    errors.poster = 'Vui lòng chọn ảnh poster'
  }

  return errors
}

function MovieForm({ initialMovie, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => normalizeInitialMovie(initialMovie))
  const [posterFile, setPosterFile] = useState(null)
  const [posterPreviewUrl, setPosterPreviewUrl] = useState('')
  const [genres, setGenres] = useState([])
  const [genreError, setGenreError] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const requiresPoster = !initialMovie

  useEffect(() => {
    setValues(normalizeInitialMovie(initialMovie))
    setPosterFile(null)
    setPosterPreviewUrl('')
  }, [initialMovie])

  useEffect(() => {
    if (!posterFile) {
      return undefined
    }

    const objectUrl = URL.createObjectURL(posterFile)
    setPosterPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [posterFile])

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

  const posterPreview = useMemo(
    () => posterPreviewUrl || values.posterUrl,
    [posterPreviewUrl, values.posterUrl]
  )

  function updateField(name, value) {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  function updatePoster(event) {
    const file = event.target.files?.[0] || null
    setPosterFile(file)
    setErrors((current) => ({ ...current, poster: validatePosterFile(file) }))
  }

  function toggleGenre(genreId) {
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

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validate(values, posterFile, requiresPoster)
    setErrors(validationErrors)
    setSubmitError('')

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    const payload = {
      ...values,
      title: values.title.trim(),
      durationMinutes: Number(values.durationMinutes),
      genreIds: values.genreIds,
    }

    setSaving(true)
    try {
      await onSubmit(payload, posterFile)
    } catch (error) {
      setSubmitError(error.message)
      setErrors(error.fieldErrors || {})
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="movie-form" onSubmit={handleSubmit}>
      {submitError && <div className="alert error-alert">{submitError}</div>}

      <section className="form-panel">
        <div className="panel-heading">
          <h2>Thông tin phim</h2>
        </div>

        <div className="form-grid">
          <label>
            <span>Ảnh poster</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={updatePoster}
            />
            {posterFile && <em className="file-name">{posterFile.name}</em>}
            {errors.poster && <small>{errors.poster}</small>}
          </label>

          <label>
            <span>Tên phim</span>
            <input
              type="text"
              value={values.title}
              onChange={(event) => updateField('title', event.target.value)}
              maxLength={150}
              required
            />
            {errors.title && <small>{errors.title}</small>}
          </label>

          <label>
            <span>Ngày phát hành</span>
            <input
              type="date"
              value={values.releaseDate}
              onChange={(event) => updateField('releaseDate', event.target.value)}
            />
          </label>

          <label>
            <span>Thời lượng</span>
            <input
              type="number"
              min="1"
              value={values.durationMinutes}
              onChange={(event) => updateField('durationMinutes', event.target.value)}
              required
            />
            {errors.durationMinutes && <small>{errors.durationMinutes}</small>}
          </label>

          <label>
            <span>Giới hạn tuổi</span>
            <input
              type="text"
              value={values.ageRating}
              onChange={(event) => updateField('ageRating', event.target.value)}
              maxLength={10}
            />
            {errors.ageRating && <small>{errors.ageRating}</small>}
          </label>

          <label>
            <span>Đạo diễn</span>
            <input
              type="text"
              value={values.director}
              onChange={(event) => updateField('director', event.target.value)}
              maxLength={100}
            />
            {errors.director && <small>{errors.director}</small>}
          </label>

          <label>
            <span>Diễn viên</span>
            <input
              type="text"
              value={values.cast}
              onChange={(event) => updateField('cast', event.target.value)}
            />
          </label>

          <label>
            <span>Ngôn ngữ</span>
            <input
              type="text"
              value={values.language}
              onChange={(event) => updateField('language', event.target.value)}
              maxLength={50}
            />
            {errors.language && <small>{errors.language}</small>}
          </label>

          <label>
            <span>Trailer</span>
            <input
              type="url"
              value={values.trailerUrl}
              onChange={(event) => updateField('trailerUrl', event.target.value)}
              placeholder="https://..."
            />
            {errors.trailerUrl && <small>{errors.trailerUrl}</small>}
          </label>

          <label>
            <span>Trạng thái</span>
            <select value={values.status} onChange={(event) => updateField('status', event.target.value)}>
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="form-panel form-section">
        <span className="field-title">Thể loại</span>
        {genreError && <div className="alert error-alert">{genreError}</div>}
        <div className="genre-options">
          {genres.map((genre) => (
            <label key={genre.id} className="checkbox-pill">
              <input
                type="checkbox"
                checked={values.genreIds.includes(genre.id)}
                onChange={() => toggleGenre(genre.id)}
              />
              <span>{genre.name}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="form-panel form-section preview-section">
        <div>
          <span className="field-title">Nội dung</span>
          <textarea
            value={values.description}
            onChange={(event) => updateField('description', event.target.value)}
            rows={8}
          />
        </div>
        <div className="poster-frame">
          <div className="poster-preview">
            {posterPreview ? <img src={posterPreview} alt="Poster preview" /> : <span>Xem trước poster</span>}
          </div>
        </div>
      </section>

      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? 'Đang lưu...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default MovieForm
