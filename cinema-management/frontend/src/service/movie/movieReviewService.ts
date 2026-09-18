import { request } from "../httpClient"
import type {
  MovieRatingSummary,
  MovieReview,
  MovieReviewEligibility,
  MovieReviewPayload,
} from "../../types/review"

export function getMovieReviews(movieId: string): Promise<MovieReview[]> {
  return request<MovieReview[]>(`/api/movies/${movieId}/reviews`)
}

export function getMovieRatingSummary(movieId: string): Promise<MovieRatingSummary> {
  return request<MovieRatingSummary>(`/api/movies/${movieId}/reviews/summary`)
}

export function getMovieReviewEligibility(movieId: string, userId: number): Promise<MovieReviewEligibility> {
  return request<MovieReviewEligibility>(`/api/movies/${movieId}/reviews/eligibility?userId=${userId}`)
}

export function createOrUpdateMovieReview(
  movieId: string,
  userId: number,
  payload: MovieReviewPayload,
): Promise<MovieReview> {
  return request<MovieReview>(`/api/movies/${movieId}/reviews?userId=${userId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}
