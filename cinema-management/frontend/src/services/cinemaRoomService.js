const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

async function request(path, options = {}) {
  const headers = {
    ...options.headers,
  }

  if (options.body) {
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

export function getRooms({ page = 0, size = 10, keyword = '', status = '' } = {}) {
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

  return request(`/api/admin/cinema-rooms?${params.toString()}`)
}

export function getRoomDetail(id) {
  return request(`/api/admin/cinema-rooms/${id}`)
}

export function updateSeatTypes(roomId, seats) {
  return request(`/api/admin/cinema-rooms/${roomId}/seats`, {
    method: 'PUT',
    body: JSON.stringify({ seats }),
  })
}
