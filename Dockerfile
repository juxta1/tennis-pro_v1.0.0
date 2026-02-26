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
RUN npm install --omit=dev

# Copy the built frontend assets
COPY --from=builder /app/dist ./dist

# Copy the server file and the database
COPY --from=builder /app/server.ts ./server.ts
# Note: In a real production environment, you should use a Docker volume for the database file
COPY --from=builder /app/tennis_league.db ./tennis_league.db

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the application using Node 22's native TypeScript support
CMD ["node", "--experimental-strip-types", "server.ts"]
