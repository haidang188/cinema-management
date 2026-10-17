const backendOrigin = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/+$/, "")

export const API_BASE_URL = (
    import.meta.env.VITE_API_URL || `${backendOrigin}/api`
).replace(/\/+$/, "")