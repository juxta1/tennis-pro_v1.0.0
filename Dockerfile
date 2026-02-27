# Use Node 22 as the base image (supports native TypeScript stripping)
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (like better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the frontend
RUN npm run build

# Final production image
FROM node:22-slim

WORKDIR /app

# Install runtime dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev && npm install -g tsx

# Copy the built frontend assets
COPY --from=builder /app/dist ./dist

# Copy the server file
COPY --from=builder /app/server.ts ./server.ts

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the application using tsx
CMD ["tsx", "server.ts"]
