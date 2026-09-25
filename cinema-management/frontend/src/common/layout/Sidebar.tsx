import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

import { Icon, isIconName } from "./icons";
import type { IconName } from "./icons";
import { useLayout } from "./LayoutContext";

export interface SidebarItem {
    label: string;
    path: string;
    icon?: IconName | ReactNode;

    section?: string;

    badge?: string | number;

    end?: boolean;
}

export interface SidebarUser {
    name: string;
    role?: string;
    avatarUrl?: string;
}

interface SidebarProps {
    brand?: string;
    items: SidebarItem[];
    user?: SidebarUser;
    onLogout?: () => void;
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderIcon(icon: SidebarItem["icon"]) {
    if (isIconName(icon)) return <Icon name={icon} />;
    if (icon) return icon;
    return <Icon name="dashboard" />;
}

function Sidebar({ brand = "PREMIERE STAFF", items, user, onLogout }: SidebarProps) {
    const { collapsed, toggleCollapsed, setMobileOpen } = useLayout();


    const brandSub = brand.replace(/^PREMIERE\s*/i, "").trim() || "STAFF";


    const groups: { section?: string; items: SidebarItem[] }[] = [];

    items.forEach((item) => {
        const last = groups[groups.length - 1];

        if (last && last.section === item.section) {
            last.items.push(item);
        } else {
            groups.push({ section: item.section, items: [item] });
        }
    });

    return (
        <aside className="pl-sidebar" aria-label="Thanh điều hướng">

            <div className="pl-sidebar-brand">
                <span className="pl-logo-mark" aria-hidden="true">
                    P
                </span>

                <span className="pl-brand-text">
                    <b>
                        PREMIERE <em>CINEMAS</em>
                    </b>
                    <small>{brandSub}</small>
                </span>

                <button
                    type="button"
                    className="pl-sidebar-close"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Đóng menu"
                >
                    <Icon name="close" />
                </button>
            </div>


            <nav className="pl-sidebar-nav">
                {groups.map((group, index) => (
                    <div className="pl-nav-group" key={`${group.section ?? "main"}-${index}`}>
                        {group.section && <span className="pl-nav-section">{group.section}</span>}

                        {group.items.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.end ?? item.path === "/"}
                                title={collapsed ? item.label : undefined}
                                className={({ isActive }) =>
                                    ["pl-nav-item", isActive ? "is-active" : ""].filter(Boolean).join(" ")
                                }
                            >
                                <span className="pl-nav-icon">{renderIcon(item.icon)}</span>
                                <span className="pl-nav-label">{item.label}</span>
                                {item.badge !== undefined && item.badge !== "" && (
                                    <span className="pl-nav-badge">{item.badge}</span>
                                )}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>


            <div className="pl-sidebar-foot">
                {user && (
                    <div className="pl-user" title={collapsed ? `${user.name} · ${user.role ?? ""}` : undefined}>
                        <span className="pl-avatar">
                            {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : getInitials(user.name)}
                        </span>

                        <span className="pl-user-text">
                            <b>{user.name}</b>
                            {user.role && <small>{user.role}</small>}
                        </span>
                    </div>
                )}

                {onLogout && (
                    <button
                        type="button"
                        className="pl-nav-item pl-logout"
                        onClick={onLogout}
                        title={collapsed ? "Đăng xuất" : undefined}
                    >
                        <span className="pl-nav-icon">
                            <Icon name="logout" />
                        </span>
                        <span className="pl-nav-label">Đăng xuất</span>
                    </button>
                )}

                <button
                    type="button"
                    className="pl-collapse-btn"
                    onClick={toggleCollapsed}
                    aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
                    title={collapsed ? "Mở rộng" : "Thu gọn"}
                >
                    <Icon name={collapsed ? "expand" : "collapse"} />
                    <span className="pl-nav-label">Thu gọn</span>
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
