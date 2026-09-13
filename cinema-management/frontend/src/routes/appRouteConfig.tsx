import { adminRoutes } from "./adminRoutes"
import { showtimeRoutes } from "./showtimeRoutes"
import { ticketPriceRoutes } from "./ticketPriceRoutes"

export const appRoutes = [
  ...adminRoutes,
  ...showtimeRoutes,
  ...ticketPriceRoutes,
]
