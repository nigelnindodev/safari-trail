FROM node:22-alpine AS builder

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM node:22-alpine AS production

WORKDIR /app

# Copy built application and required files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 5000

CMD ["node", "dist/main"]
