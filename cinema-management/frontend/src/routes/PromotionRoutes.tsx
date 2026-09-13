import { PromotionList } from "../component/promotions/PromotionList";
import { PromotionCreate } from "../component/promotions/PromotionCreate";
import { PromotionDetail } from "../component/promotions/PromotionDetail";

export const promotionRoutes = [
    {
        path: "/admin/promotions",
        element: <PromotionList />
    },
    {
        path: "/admin/promotions/create",
        element: <PromotionCreate />
    },
    {
        path: "/admin/promotions/:id",
        element: <PromotionDetail />
    }
];