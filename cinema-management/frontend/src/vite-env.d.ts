/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    // Khai báo thêm các biến môi trường khác (nếu có) bên dưới
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}