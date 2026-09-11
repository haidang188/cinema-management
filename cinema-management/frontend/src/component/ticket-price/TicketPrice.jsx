import "./TicketPrice.css";
import { useEffect, useState } from "react";
import { getTicketPrices } from "../../service/ticketPriceService.js";

function TicketPrice() {

    const [ticketPrices, setTicketPrices] = useState([]);

    useEffect(() => {

        const loadTicketPrices = async () => {

            const data = await getTicketPrices();

            setTicketPrices(data);

        };

        loadTicketPrices();

    }, []);

    const getRoomTypeName = (roomType) => {

        const roomTypes = {
            STANDARD: "Phòng tiêu chuẩn",
            SPECIAL: "Phòng đặc biệt",
            PREMIUM: "Phòng cao cấp"
        };

        return roomTypes[roomType] || roomType;
    };

    const getSeatTypeName = (seatType) => {

        const seatTypes = {
            NORMAL: "Ghế thường",
            VIP: "Ghế VIP"
        };

        return seatTypes[seatType] || seatType;
    };

    const getDayTypeName = (dayType) => {

        const dayTypes = {
            WEEKDAY: "Ngày thường",
            WEEKEND: "Cuối tuần",
            HOLIDAY: "Ngày lễ"
        };

        return dayTypes[dayType] || dayType;
    };

    const formatPrice = (price) => {

        return new Intl.NumberFormat("vi-VN").format(price) + "đ";

    };

    const dayTypes = [
        ...new Set(
            ticketPrices.map(item => item.dayType))
    ];

    const roomTypes = [
        ...new Set(ticketPrices.map(item => item.roomType)
        )
    ];

    const seatTypes = [
        ...new Set(ticketPrices.map(item => item.seatType)
        )
    ];

    const getPrice = (roomType, seatType, dayType) => {

        const ticketPrice =
            ticketPrices.find(
                item =>
                    item.roomType === roomType &&
                    item.seatType === seatType &&
                    item.dayType === dayType
            );

        return ticketPrice
            ? formatPrice(ticketPrice.price)
            : "-";
    };


    return (

        <div className="ticket-price-page">

            <div className="ticket-price-header">

                <h1>
                    GIÁ VÉ
                </h1>

                <p>
                    Bảng giá vé xem phim
                </p>

            </div>

            {ticketPrices.length === 0 ? (

                <div className="ticket-price-empty">

                    Không có thông tin giá vé.

                </div>

            ) : (

                <div className="ticket-price-list">

                    {roomTypes.map(
                        (roomType) => (

                            <div
                                className="ticket-price-card"
                                key={roomType}
                            >

                                <div className="ticket-price-title">

                                    {getRoomTypeName(
                                        roomType
                                    )}

                                </div>


                                <div className="ticket-price-table-wrapper">

                                    <table className="ticket-price-table">

                                        <thead>

                                        <tr>

                                            <th>
                                                Loại ghế
                                            </th>

                                            {dayTypes.map(
                                                (dayType) => (

                                                    <th
                                                        key={dayType}
                                                    >
                                                        {getDayTypeName(
                                                            dayType
                                                        )}
                                                    </th>

                                                )
                                            )}

                                        </tr>

                                        </thead>


                                        <tbody>

                                        {seatTypes.map(
                                            (seatType) => (

                                                <tr
                                                    key={seatType}
                                                >

                                                    <td>
                                                        {getSeatTypeName(
                                                            seatType
                                                        )}
                                                    </td>

                                                    {dayTypes.map(
                                                        (dayType) => (

                                                            <td
                                                                key={dayType}
                                                            >
                                                                {getPrice(
                                                                    roomType,
                                                                    seatType,
                                                                    dayType
                                                                )}
                                                            </td>

                                                        )
                                                    )}

                                                </tr>

                                            )
                                        )}

                                        </tbody>

                                    </table>

                                </div>

                            </div>

                        )
                    )}

                </div>

            )}

        </div>
    );
}

export default TicketPrice;