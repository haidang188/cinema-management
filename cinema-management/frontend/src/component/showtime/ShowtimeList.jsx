function ShowtimeList({
                          showtimes,
                          selectedShowtime,
                          onSelectShowtime
                      }) {

    return (
        <div className="showtime-list">
            <h3 className="showtime-list-title">
                LỊCH CHIẾU

            </h3>
            {showtimes.length === 0 ? (
                <p className="no-showtime">
                    Không có suất chiếu phù hợp

                </p>
            ) : (

                showtimes.map((showtime) => (

                    <div className="showtime-room"
                         key={showtime.id}>

                        <div className="showtime-room-name">
                            {showtime.roomName}

                            <span>
                                {" - "}
                                {showtime.roomType}
                            </span>


                        </div>

                        <div className="showtime-times">
                            {showtime.times.map((time) => {
                                const isSelected =
                                    selectedShowtime?.showtimeId === showtime.id &&
                                    selectedShowtime?.time === time;
                                return (
                                    <button key={time}
                                            className={
                                                isSelected
                                                    ? "showtime-time selected"
                                                : "showtime-time"
                                            }
                                            onClick={() => onSelectShowtime({
                                                    showtimeId: showtime.id,
                                                    roomName: showtime.roomName,
                                                    roomType: showtime.roomType,
                                                    time: time,
                                                })}
                                                >
                                                {time}
                                                </button>
                                                );

                                            })}

                        </div>
                    </div>
                ))
            )}

        </div>
    );

}

export default ShowtimeList;