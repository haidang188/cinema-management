import CounterSalePage from "../pages/counter-sale/CounterSalePage";
import CounterSaleSeatsPage from "../pages/counter-sale/CounterSaleSeatsPage";
import CounterSaleConfirmPage from "../pages/counter-sale/CounterSaleConfirmPage";
import CounterSaleResultPage from "../pages/counter-sale/CounterSaleResultPage";

export const counterSaleRoutes = [
    {
        path: "/counter-sale",
        element: <CounterSalePage />,
    },
    {
        path: "/counter-sale/seats",
        element: <CounterSaleSeatsPage />,
    },
    {
        path: "/counter-sale/confirm",
        element: <CounterSaleConfirmPage />,
    },
    {
        path: "/counter-sale/result",
        element: <CounterSaleResultPage />,
    },
];