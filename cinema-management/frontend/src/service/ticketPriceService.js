import axios from "axios";

const URL = import.meta.env.VITE_API_URL;

export const getTicketPrices = async () => {

    try {

        const res = await axios.get(`${URL}/ticket-prices`);

        return res.data;

    } catch (error) {

        console.log(error);

        return [];
    }
};