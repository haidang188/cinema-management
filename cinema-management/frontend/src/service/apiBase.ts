// Nguồn cấu hình URL backend duy nhất cho toàn bộ frontend.
// Ưu tiên VITE_API_URL (vd. http://localhost:8080/api); VITE_API_BASE_URL (origin, không có /api)
// được giữ để tương thích ngược.
const legacyOrigin = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/+$/, "").replace(/\/api$/, "")

/** URL gốc của REST API, đã gồm hậu tố /api. */
export const API_BASE_URL = (
    import.meta.env.VITE_API_URL || `${legacyOrigin}/api`
).replace(/\/+$/, "")

/** Origin của backend (không có /api), dùng cho các client tự ghép "/api/..." và WebSocket. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "")

export const WS_URL = (
    import.meta.env.VITE_WS_URL || `${API_ORIGIN.replace(/^http/, "ws")}/ws`
).replace(/\/+$/, "")
