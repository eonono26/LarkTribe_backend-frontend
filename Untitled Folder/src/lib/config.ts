const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const cleanApiUrl = rawApiUrl.replace(/\/+$/, "");

export const API_URL = cleanApiUrl.endsWith("/api") ? cleanApiUrl : `${cleanApiUrl}/api`;
export const API_BASE_URL = cleanApiUrl.replace(/\/api$/, "");
