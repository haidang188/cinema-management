const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

async function request(path, options = {}) {
  const headers = {
    ...options.headers,
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message = data?.message || 'Có lỗi xảy ra, vui lòng thử lại'
    const error = new Error(message)
    error.status = response.status
    error.fieldErrors = data?.fieldErrors
    throw error
  }

  return data
}

function buildMovieFormData(payload, posterFile) {
  const formData = new FormData()
  const moviePayload = { ...payload }
  delete moviePayload.posterUrl

  formData.append('movie', new Blob([JSON.stringify(moviePayload)], { type: 'application/json' }))
  if (posterFile) {
    formData.append('poster', posterFile)
  }

  return formData
}

export function getMovies({ page = 0, size = 10, keyword = '', status = '' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })

  if (keyword.trim()) {
    params.set('keyword', keyword.trim())
  }
  if (status) {
    params.set('status', status)
  }

  return request(`/api/movies/admin?${params.toString()}`)
}

export function getMovie(id) {
  return request(`/api/movies/admin/${id}`)
}

export function createMovie(payload, posterFile) {
  return request('/api/movies/admin', {
    method: 'POST',
    body: buildMovieFormData(payload, posterFile),
  })
}

export function updateMovie(id, payload, posterFile) {
  return request(`/api/movies/admin/${id}`, {
    method: 'PUT',
    body: buildMovieFormData(payload, posterFile),
  })
}

export function getGenres() {
  return request('/api/admin/genres')
}
