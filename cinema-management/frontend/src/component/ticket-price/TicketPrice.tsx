import "./TicketPrice.css";
import { useEffect, useState } from "react";
import { getTicketPrices } from "../../service/ticket-price/ticketPriceService";

interface TicketPriceData {
    id: number;
    roomType: string;
    seatType: string;
    dayType: string;
    price: number;
}

interface TypeNameMap {
    [key: string]: string;
}

function TicketPrice() {

    const [ticketPrices, setTicketPrices] = useState<TicketPriceData[]>([]);

    useEffect(() => {

        const loadTicketPrices = async () => {

            const data = await getTicketPrices();

            setTicketPrices(data);

        };

        loadTicketPrices();

    }, []);

    const getRoomTypeName = (roomType: string): string => {

        const roomTypes: TypeNameMap = {
            STANDARD: "Phòng tiêu chuẩn",
            SPECIAL: "Phòng đặc biệt",
            PREMIUM: "Phòng cao cấp"
        };

        return roomTypes[roomType] || roomType;
    };

    const getSeatTypeName = (seatType: string): string => {

        const seatTypes: TypeNameMap = {
            NORMAL: "Ghế thường",
            VIP: "Ghế VIP"
        };

        return seatTypes[seatType] || seatType;
    };

    const getDayTypeName = (dayType: string): string => {

        const dayTypes: TypeNameMap = {
            WEEKDAY: "Ngày thường",
            WEEKEND: "Cuối tuần",
            HOLIDAY: "Ngày lễ"
        };

        return dayTypes[dayType] || dayType;
    };

    const formatPrice = (price: number): string => {

        return new Intl.NumberFormat("vi-VN").format(price) + "đ";

    };

    const dayTypes: string[] = [
        ...new Set(
            ticketPrices.map(item => item.dayType)
        )
    ];

    const roomTypes: string[] = [
        ...new Set(
            ticketPrices.map(item => item.roomType)
        )
    ];

    const seatTypes: string[] = [
        ...new Set(
            ticketPrices.map(item => item.seatType)
        )
    ];

    const getPrice = (
        roomType: string,
        seatType: string,
        dayType: string
    ): string => {

        const ticketPrice = ticketPrices.find(
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
                    GIÁ VÉ THAM KHẢO
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