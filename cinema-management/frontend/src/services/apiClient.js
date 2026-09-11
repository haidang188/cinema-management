export const API_URL =
  import.meta.env.VITE_API_URL ??
  'http://localhost:8080'

async function parseResponse(response) {
  const text = await response.text()

  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ?? 'Có lỗi xảy ra'
    )

    error.status = response.status
    error.errors = data?.errors ?? {}
    throw error
  }

  return data
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options)
  return parseResponse(response)
}
