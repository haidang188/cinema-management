function MovieList({movies, selectedMovie, onSelectMovie})  {
    return (
        <div className="movie-list">
            {movies.map((movie) => (
                <div key={movie.id} className={selectedMovie.id === movie.id ? "movie-item active" : "movie-item"}
                onClick={() => onSelectMovie(movie)}>

                    <div className="movie-poster">
                        <img src={movie.poster} alt={movie.title} />

                    </div>

                    <div className="movie-info">
                        <h3>{movie.title}</h3>
                        <p>{movie.genres}</p>

                        <div className="movie-meta">
                            <span>{movie.duration} Min</span>
                            <span>{movie.ageRating}</span>


                        </div>

                    </div>

                </div>
            ) )}

        </div>

    )
}
export default MovieList;