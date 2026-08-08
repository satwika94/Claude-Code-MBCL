# ---- Build stage: install deps & build frontend ----
FROM node:20-slim AS build

WORKDIR /app

# Install dependencies backend
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Install & build frontend
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN npm --prefix frontend ci
COPY frontend ./frontend
RUN npm --prefix frontend run build

# Salin sisa source backend
COPY server.js ./
COPY src ./src
COPY db ./db

# ---- Runtime stage: image final, lebih kecil ----
FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/src ./src
COPY --from=build /app/db ./db
COPY --from=build /app/frontend/dist ./frontend/dist

# DATABASE_URL (connection string PostgreSQL, mis. Supabase/Neon) wajib
# di-set lewat env var platform hosting saat run container ini.

EXPOSE 3000
CMD ["node", "server.js"]
