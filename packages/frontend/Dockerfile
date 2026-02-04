# Simple Dockerfile for Claw Control Frontend
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/
RUN npm ci

COPY . .
RUN npm run build --workspace=@claw-control/frontend

# Production - serve with simple static server
FROM node:22-alpine
RUN npm install -g serve
COPY --from=builder /app/packages/frontend/dist /app/dist
WORKDIR /app
EXPOSE 3000
CMD ["sh", "-c", "serve -s dist -p $PORT"]
