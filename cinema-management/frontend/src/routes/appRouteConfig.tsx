import { adminRoutes } from "./adminRoutes"
import { promotionRoutes } from "./PromotionRoutes"
import { showtimeRoutes } from "./showtimeRoutes"
import { ticketPriceRoutes } from "./ticketPriceRoutes"

export const appRoutes = [
  ...adminRoutes,
  ...promotionRoutes,
  ...showtimeRoutes,
  ...ticketPriceRoutes,
]
