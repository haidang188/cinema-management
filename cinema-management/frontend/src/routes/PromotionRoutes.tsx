import { PromotionEdit } from '../component/promotions/PromotionEdit';
import { PromotionList } from "../component/promotions/PromotionList";
import { PromotionCreate } from "../component/promotions/PromotionCreate";
import { PromotionDetail } from "../component/promotions/PromotionDetail";

export const promotionRoutes = [
    { path: "/admin/promotions/:id/edit", element: <PromotionEdit /> },
    { path: "/admin/promotions/:id/delete", element: <PromotionDetail deleteMode /> },
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