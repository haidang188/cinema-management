import axios from "axios";

const URL = import.meta.env.VITE_API_URL;
export const getShowtimesByDate = async (date) => {
    try {
        const res = await axios.get(`${URL}/showtimes`, {
            params: {
                date: date
            }
        });
        return res.data;
    } catch (e) {
        console.log(e);
    }
    return [];
};
