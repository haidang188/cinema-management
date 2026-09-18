export interface MovieReview{
    id: number
    movieId: number
    userId: number
    reviewerName: string
    rating: number
    content: string | null
    createdAt: string
    updatedAt: string
}
export interface MovieRatingSummary{
    movieId: number
    averageRating: number
    totalReviews: number
}
export interface MovieReviewPayload{
    rating: number
    content: string
}

export interface MovieReviewEligibility {
    movieId: number
    userId: number
    canReview: boolean
}
