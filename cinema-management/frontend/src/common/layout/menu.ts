import type { SidebarItem } from "./Sidebar";

export const employeeMenu: SidebarItem[] = [
    {
        label: "Bán vé",
        path: "/counter-sale",
        icon: "ticket",
        section: "Bán hàng",
    },
    {
        label: "Lịch chiếu",
        path: "/showtimes",
        icon: "calendar",
        section: "Tra cứu",
    },
    {
        label: "Phim",
        path: "/",
        icon: "film",
        section: "Tra cứu",

        end: true,
    },
];
