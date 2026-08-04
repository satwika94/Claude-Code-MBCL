// Default: "/api" (relatif) — dipakai saat frontend & backend jalan dari
// satu origin yang sama (dev via proxy Vite, atau production saat Express
// men-serve hasil build frontend langsung).
//
// Kalau frontend di-deploy TERPISAH dari backend (mis. frontend di Vercel,
// backend di Railway/Render), isi VITE_API_URL di frontend/.env dengan URL
// penuh backend, contoh:
//   VITE_API_URL=https://nama-app-kamu.up.railway.app/api
const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Permintaan gagal (${res.status})`);
  }
  return body.data;
}

export const api = {
  createUser: (profile) =>
    request("/users", { method: "POST", body: JSON.stringify(profile) }),

  getUser: (id) => request(`/users/${id}`),

  searchFoods: (query, { diet, limit = 8 } = {}) => {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (diet && diet !== "none") params.set("diet", diet);
    params.set("limit", String(limit));
    return request(`/foods?${params.toString()}`);
  },

  logMeal: ({ userId, foodId, portionG }) =>
    request("/log-meal", {
      method: "POST",
      body: JSON.stringify({ userId, foodId, portionG }),
    }),

  deleteLog: (logId) => request(`/log-meal/${logId}`, { method: "DELETE" }),

  getMealLogs: (userId, date) =>
    request(`/meal-logs/${userId}${date ? `?date=${date}` : ""}`),

  getDailySummary: (userId, date) =>
    request(`/daily-summary/${userId}${date ? `?date=${date}` : ""}`),

  getRecommendedMenu: (userId) => request(`/recommend-menu/${userId}`),

  getHistory: (userId, days = 7) => request(`/history/${userId}?days=${days}`),
};
