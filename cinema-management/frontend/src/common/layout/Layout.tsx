import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { LayoutContext } from "./LayoutContext";
import type { LayoutState } from "./LayoutContext";

import "./layout.css";

interface LayoutProps {
    children: ReactNode;
    header?: ReactNode;
    sidebar?: ReactNode;
    footer?: ReactNode;
}

const COLLAPSED_KEY = "premiere.sidebar.collapsed";

function readCollapsed(): boolean {
    try {
        return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
        return false;
    }
}

function Layout({ children, header, sidebar, footer }: LayoutProps) {
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [mobileOpen, setMobileOpen] = useState(false);

    const toggleCollapsed = useCallback(() => {
        setCollapsed((value) => {
            const next = !value;

            try {
                localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
            } catch {

            }

            return next;
        });
    }, []);


    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);


    useEffect(() => {
        if (!mobileOpen) return;

        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") setMobileOpen(false);
        }

        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [mobileOpen]);

    const value = useMemo<LayoutState>(
        () => ({ collapsed, toggleCollapsed, mobileOpen, setMobileOpen }),
        [collapsed, toggleCollapsed, mobileOpen]
    );

    const className = [
        "pl-shell",
        sidebar ? "has-sidebar" : "",
        collapsed ? "is-collapsed" : "",
        mobileOpen ? "is-mobile-open" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <LayoutContext.Provider value={value}>
            <div className={className}>
                <a className="pl-skip-link" href="#pl-main">
                    Bỏ qua điều hướng
                </a>

                {sidebar}

                {sidebar && (
                    <div
                        className="pl-backdrop"
                        aria-hidden="true"
                        onClick={() => setMobileOpen(false)}
                    />
                )}

                <div className="pl-main">
                    {header}

                    <main id="pl-main" className="pl-content" tabIndex={-1}>
                        {children}
                    </main>

                    {footer}
                </div>
            </div>
        </LayoutContext.Provider>
    );
}

export default Layout;
