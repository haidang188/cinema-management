import type { Movie } from '../types/movie'

const API_BASE_URL = 'http://localhost:8080/api/movies'

export async function getNowShowingMovies(): Promise<Movie[]> {
  const response = await fetch(`${API_BASE_URL}/now-showing`)

  if (!response.ok) {
    throw new Error('Không thể tải danh sách phim')
  }

  return response.json()
}
