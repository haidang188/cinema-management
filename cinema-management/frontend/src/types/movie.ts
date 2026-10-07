export interface MovieGenre{
  id: number
  name: string
}
export interface Movie {
  id: number
  title: string
  description: string
  durationMinutes: number
  releaseDate: string
  ageRating: string
  director: string
  cast: string
  language: string
  posterUrl: string
  trailerUrl: string
  status: string
  genres?: MovieGenre[]
}
