USE cinema_management;

CREATE TABLE IF NOT EXISTS movie_reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    movie_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    rating TINYINT NOT NULL,
    content TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_movie_reviews_movie
    FOREIGN KEY (movie_id)
    REFERENCES movies(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_movie_reviews_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

    CONSTRAINT chk_movie_reviews_rating
    CHECK (rating >= 1 AND rating <= 5),

    CONSTRAINT uq_movie_reviews_movie_user
    UNIQUE (movie_id, user_id)
);