/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_WS_URL?: string;
    readonly VITE_VIETQR_BANK_ID?: string;
    readonly VITE_VIETQR_BANK_NAME?: string;
    readonly VITE_VIETQR_ACCOUNT_NO?: string;
    readonly VITE_VIETQR_ACCOUNT_NAME?: string;
    readonly VITE_VIETQR_TEMPLATE?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
