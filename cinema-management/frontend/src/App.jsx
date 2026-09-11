import { BrowserRouter, Routes, Route } from "react-router-dom";

import Showtime from "./component/showtime/Showtime.jsx";
import TicketPrice from "./component/ticket-price/TicketPrice.jsx";

function App() {

  return (
      <BrowserRouter>

        <Routes>

          <Route
              path="/showtimes"
              element={<Showtime />}
          />

          <Route
              path="/ticket-prices"
              element={<TicketPrice />}
          />

        </Routes>

      </BrowserRouter>
  );
}

export default App;