import {
    CustomerPromotionList,
    CustomerPromotionDetail,
} from "../component/customer-promotions/CustomerPromotions"

export const customerPromotionRoutes = [
    {
        path: "/promotions",
        element: <CustomerPromotionList />,
    },
    {
        path: "/promotions/:id",
        element: <CustomerPromotionDetail />,
    },
]