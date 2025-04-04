# Stage 1: Dependencies and Build
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY kalakaar/package.json kalakaar/package-lock.json* ./kalakaar/

# Install dependencies
RUN npm ci && cd kalakaar && npm ci

# Copy application code
COPY . .

# Build the application
RUN cd kalakaar && npm run build

# Stage 2: Production
FROM node:18-alpine AS runner
WORKDIR /app

# Set to production environment
ENV NODE_ENV production

# Create a non-root user to run the app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 svelte

# Copy only necessary files from the builder stage
COPY --from=builder --chown=svelte:nodejs /app/kalakaar/build ./kalakaar/build
COPY --from=builder --chown=svelte:nodejs /app/kalakaar/node_modules ./kalakaar/node_modules
COPY --from=builder --chown=svelte:nodejs /app/kalakaar/package.json ./kalakaar/

# Switch to non-root user
USER svelte

# Expose the port the app will run on
EXPOSE 3000

# Set the command to start the app
WORKDIR /app/kalakaar
CMD ["node", "build/index.js"] 