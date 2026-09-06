import ShowtimeList from "./ShowtimeList.jsx";
function MovieDetail({movie, showtimes, selectedShowtime, onSelectShowtime}) {
    return (
        <div className="movie-detail">
            <div className="movie-detail-header">
                <div className="movie-detail-poster">
                    <img src={movie.poster} alt={movie.title}/>

                </div>
                <div className="movie-detail-info">
                    <h2>{movie.title}</h2>
                    <p>{movie.genres}</p>
                    <p>
                        {movie.duration} Min | {movie.ageRating}
                    </p>


                </div>

            </div>
            <ShowtimeList
                showtimes={showtimes}
                selectedShowtime={selectedShowtime}
                onSelectShowtime={onSelectShowtime}
            />
            {selectedShowtime && (
                <div className="selected-showtime">
                    <p>Đã chọn:</p>
                    <strong>
                        {movie.title}
                    </strong>

                    <span>
                        {" - "}
                        {selectedShowtime.roomName}
                    </span>

                    <span>
                        {" - "}
                        {selectedShowtime.time}
                    </span>

                </div>
            )}
        </div>
    )

}
export default MovieDetail;