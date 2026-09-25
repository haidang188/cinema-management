import { createContext, useContext } from "react";

export type LayoutState = {
    collapsed: boolean;
    toggleCollapsed: () => void;
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
};

const noop = () => undefined;

export const LayoutContext = createContext<LayoutState>({
    collapsed: false,
    toggleCollapsed: noop,
    mobileOpen: false,
    setMobileOpen: noop,
});

export function useLayout(): LayoutState {
    return useContext(LayoutContext);
}
