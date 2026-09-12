
interface Showtime {
    id: number;
    roomId: number;
    roomName: string;
    roomType: string;
    startTime: string;
}

interface SelectedShowtime {
    showtimeId: number;
    roomName: string;
    roomType: string;
    time: string;
}

interface ShowtimeListProps {
    showtimes: Showtime[];
    selectedShowtime?: SelectedShowtime | null;
    onSelectShowtime: (showtime: SelectedShowtime) => void;
}

interface RoomGroup {
    roomId: number;
    roomName: string;
    roomType: string;
    showtimes: Showtime[];
}

function ShowtimeList({
                          showtimes,
                          selectedShowtime,
                          onSelectShowtime
                      }: ShowtimeListProps) {

    const groupedShowtimes = showtimes.reduce<Record<number, RoomGroup>>(
        (groups, showtime) => {

            const roomId = showtime.roomId;

            if (!groups[roomId]) {
                groups[roomId] = {
                    roomId: showtime.roomId,
                    roomName: showtime.roomName,
                    roomType: showtime.roomType,
                    showtimes: []
                };
            }

            groups[roomId].showtimes.push(showtime);

            return groups;

        },
        {}
    );

    const rooms = Object.values(groupedShowtimes);

    const formatTime = (startTime: string): string => {
        return new Date(startTime).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className="showtime-list">

            <h3 className="showtime-list-title">
                LỊCH CHIẾU
            </h3>

            {rooms.length === 0 ? (
                <p className="no-showtime">
                    Không có suất chiếu phù hợp
                </p>
            ) : (
                rooms.map((room) => (
                    <div
                        className="showtime-room"
                        key={room.roomId}
                    >

                        <div className="showtime-room-name">
                            {room.roomName}

                            <span>
                                {" - "}
                                {room.roomType}
                            </span>
                        </div>

                        <div className="showtime-times">

                            {room.showtimes.map((showtime) => {

                                const time = formatTime(
                                    showtime.startTime
                                );

                                const isSelected =
                                    selectedShowtime?.showtimeId === showtime.id;

                                return (
                                    <button
                                        key={showtime.id}
                                        className={
                                            isSelected
                                                ? "showtime-time selected"
                                                : "showtime-time"
                                        }
                                        onClick={() =>
                                            onSelectShowtime({
                                                showtimeId: showtime.id,
                                                roomName: showtime.roomName,
                                                roomType: showtime.roomType,
                                                time: time
                                            })
                                        }
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