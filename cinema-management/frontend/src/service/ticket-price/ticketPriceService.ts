import axios from "axios";
import type {TicketPriceData} from "../../types/ticket-price/ticketPrice";

const URL: string = import.meta.env.VITE_API_URL;


export const getTicketPrices = async (): Promise<TicketPriceData[]> => {

    try {

        const res = await axios.get<TicketPriceData[]>(
            `${URL}/ticket-prices`
        );

        return res.data;

    } catch (error) {

        console.error("Error fetching ticket prices:", error);

        return [];
    }
};