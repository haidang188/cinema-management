import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";

import { Icon } from "./icons";
import { useLayout } from "./LayoutContext";

export interface HeaderNavItem {
    label: string;
    path: string;
}

interface HeaderProps {
    logo?: ReactNode;
    navItems?: HeaderNavItem[];
    rightContent?: ReactNode;

    title?: ReactNode;

    showClock?: boolean;
}

function useClock(enabled: boolean): Date {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        if (!enabled) return;


        let intervalId = 0;
        const timeoutId = window.setTimeout(() => {
            setNow(new Date());
            intervalId = window.setInterval(() => setNow(new Date()), 60_000);
        }, 60_000 - (Date.now() % 60_000));

        return () => {
            window.clearTimeout(timeoutId);
            window.clearInterval(intervalId);
        };
    }, [enabled]);

    return now;
}

function Header({
                    logo = (
                        <>
                            PREMIERE <span>CINEMAS</span>
                        </>
                    ),
                    navItems = [],
                    rightContent,
                    title,
                    showClock = true,
                }: HeaderProps) {
    const { setMobileOpen } = useLayout();
    const now = useClock(showClock);

    return (
        <header className="pl-header">
            <button
                type="button"
                className="pl-icon-btn pl-menu-btn"
                onClick={() => setMobileOpen(true)}
                aria-label="Mở menu"
            >
                <Icon name="menu" />
            </button>


            <Link to="/" className="pl-header-logo">
                {logo}
            </Link>

            {title && <div className="pl-header-title">{title}</div>}

            {navItems.length > 0 && (
                <nav className="pl-header-nav" aria-label="Điều hướng chính">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === "/"}
                            className={({ isActive }) => (isActive ? "is-active" : "")}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            )}

            <div className="pl-header-right">
                {showClock && (
                    <div className="pl-clock" title={now.toLocaleString("vi-VN")}>
                        <Icon name="clock" size={15} />
                        <b>
                            {now.toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                            })}
                        </b>
                        <span>
                            {now.toLocaleDateString("vi-VN", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                            })}
                        </span>
                    </div>
                )}

                {rightContent && <div className="pl-header-actions">{rightContent}</div>}
            </div>
        </header>
    );
}

export default Header;
