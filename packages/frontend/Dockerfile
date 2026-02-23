# Claw Control Frontend
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/
RUN npm ci
COPY . .
RUN npm run build --workspace=@claw-control/frontend

# Production - use serve with runtime config injection (SPA-safe)
FROM node:22-alpine
RUN npm install -g serve
COPY --from=builder /app/packages/frontend/dist /app
COPY packages/frontend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
WORKDIR /app
CMD ["/app/entrypoint.sh"]
