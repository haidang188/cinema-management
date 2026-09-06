import "./Showtime.css"
import MovieList from "./MovieList";
import MovieDetail from "./MovieDetail";
import {useState} from "react";

function Showtime() {

    const movies = [
        {
            id: 1,
            title: "Lửa trắng",
            genres: "Hành động",
            duration: 120,
            ageRating: "16+",
            poster: "https://res.cloudinary.com/dazpnizx8/image/upload/v1788660935/lua-trang_mwf4i1.jpg"
        },
        {
            id: 2,
            title: "Bố giá",
            genres: "Tình cảm",
            duration: 130,
            ageRating: "18+",
            poster: "https://res.cloudinary.com/dazpnizx8/image/upload/v1788660936/bo-gia_bjqhwf.jpg"
        },
        {
            id: 3,
            title: "Doremon",
            genres: "Hoạt hình",
            duration: 60,
            ageRating: "10+",
            poster: "https://res.cloudinary.com/dazpnizx8/image/upload/v1788660936/Doraemon_Movie_2025_Poster_hcjjbd.jpg"
        },
        {
            id: 4,
            title: "Tiệc trăng máu",
            genres: "Hài",
            duration: 130,
            ageRating: "16+",
            poster: "https://res.cloudinary.com/dazpnizx8/image/upload/v1788660935/Tiec_trang_mau_poster_jsntex.jpg"
        }
    ];

    const showtimes = [
        {
            id: 1,
            movieId: 1,
            date: "2026-09-13",
            cinema: "Cinema 1",
            roomName: "Phòng 1",
            roomType: "Tiêu chuẩn",
            times: ["9:30", "13:30", "14:30"]
        },
        {
            id: 2,
            movieId: 1,
            date: "2026-09-13",
            cinema: "Cinema 1",
            roomName: "Phòng 2",
            roomType: "Đặc biệt",
            times: ["18:45", "21:30", "23:30"]
        },
        {
            id: 3,
            movieId: 1,
            date: "2026-09-13",
            cinema: "Cinema 2",
            roomName: "Phòng 3",
            roomType: "Cao cấp",
            times: ["17:00", "19:30", "22:30"]
        },
        {
            id: 4,
            movieId: 2,
            date: "2026-09-13",
            cinema: "Cinema 1",
            roomName: "Phòng 1",
            roomType: "Tiêu chuẩn",
            times: ["10:00", "14:00", "18:00"]
        },
        {
            id: 5,
            movieId: 2,
            date: "2026-09-13",
            cinema: "Cinema 2",
            roomName: "Phòng 2",
            roomType: "Đặc biệt",
            times: ["16:00", "19:00", "22:00"]
        },
        {
            id: 6,
            movieId: 3,
            date: "2026-09-13",
            cinema: "Cinema 1",
            roomName: "Phòng 3",
            roomType: "Cao cấp",
            times: ["9:00", "12:00", "14:30"]
        },
        {
            id: 7,
            movieId: 4,
            date: "2026-09-13",
            cinema: "Cinema 1",
            roomName: "Phòng 1",
            roomType: "Tiêu chuẩn",
            times: ["9:30", "13:30", "14:30"]
        },
        {
            id: 8,
            movieId: 1,
            date: "2026-09-14",
            cinema: "Cinema 3",
            roomName: "Phòng 1",
            roomType: "Tiêu chuẩn",
            times: ["9:30", "13:30", "14:30"]
        },
        {
            id: 9,
            movieId: 2,
            date: "2026-09-14",
            cinema: "Cinema 2",
            roomName: "Phòng 2",
            roomType: "Đặc biệt",
            times: ["9:30", "13:30", "14:30"]
        },
    ]

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedCinema, setSelectedCinema] = useState("");
    const [selectedGenre, setSelectedGenre] = useState("");
    const [selectedMovie, setSelectedMovie] = useState(movies[0]);
    const [selectedShowtime, setSelectedShowtime] = useState(null);

    const filteredShowtimes = showtimes.filter((showtime) => {
        if (!selectedMovie) {
            return false;
        }
        const matchMovie = showtime.movieId === selectedMovie.id;

        const matchDate = !selectedDate || showtime.date === selectedDate;

        const matchCinema = !selectedCinema || showtime.cinema === selectedCinema;

        return matchMovie && matchDate && matchCinema;
    });

    const handleSelectMovie = (movie) => {
        setSelectedMovie(movie);
        setSelectedShowtime(null);
    };

    const handleSelectGenre = (genre) => {
        setSelectedGenre(genre);

        const filtered = genre
            ? movies.filter((movie) => movie.genres === genre)
            : movies;

        if (filtered.length > 0) {
            setSelectedMovie(filtered[0]);
        } else {
            setSelectedMovie(null);
        }
        setSelectedShowtime(null);
    };

    const filteredMovies = selectedGenre
        ? movies.filter((movie) => movie.genres === selectedGenre)
        : movies;

    const cinemas = [
        "Tất cả các rạp",
        "Cinema 1",
        "Cinema 2",
        "Cinema 3",
    ];
    const genres = [
        "Tất cả các thể loại",
        "Hành động",
        "Tình cảm",
        "Hài",
        "Hoạt hình"
    ];


    return (
        <div className="showtime-page">
            <h1>CHỌN PHIM VÀ SUẤT CHIẾU</h1>
            <p className="showtime-subtitle">
                Chọn phim và suất chiếu mong muốn

            </p>

            <div className="filter-container">
                <div className="filter-item">
                    <label>Ngày chiếu</label>
                    <input type="date"
                           value={selectedDate}
                           onChange={(event) => {
                               setSelectedDate(event.target.value);
                               setSelectedShowtime(null);
                           }}
                    />

                </div>
                <div className="filter-item">
                    <label>Rạp/Phòng chiếu</label>
                    <select value={selectedCinema}
                            onChange={(event) => {
                                setSelectedCinema(event.target.value);
                                setSelectedShowtime(null);

                            }}>

                        <option value="">Tât cả các rạp</option>
                        {cinemas.slice(1).map((cinema) => (
                            <option key={cinema} value={cinema}>{cinema}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-item">
                    <label>Thể loại</label>
                    <select value={selectedGenre}
                            onChange={(event) => handleSelectGenre(event.target.value)}>

                        <option value="">Tất cả thể loại</option>
                        {genres.slice(1).map((genre) => (
                            <option key={genre} value={genre}>{genre}</option>
                        ))}
                    </select>
                </div>

            </div>

            <div className="showtime-content">
                <MovieList
                    movies={filteredMovies}
                    selectedMovie={selectedMovie}
                    onSelectMovie={handleSelectMovie}/>

                <MovieDetail
                    movie={selectedMovie}
                    showtimes={filteredShowtimes}
                    selectedShowtime={selectedShowtime}
                    onSelectShowtime={setSelectedShowtime}
                />

            </div>

        </div>
    );
}

export default Showtime;