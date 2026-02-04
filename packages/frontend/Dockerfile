# Claw Control Frontend
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/
RUN npm ci
COPY . .
RUN npm run build --workspace=@claw-control/frontend

# Production - use http-server with runtime config injection
FROM node:22-alpine
RUN npm install -g http-server
COPY --from=builder /app/packages/frontend/dist /app
COPY packages/frontend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
WORKDIR /app
CMD ["/app/entrypoint.sh"]
