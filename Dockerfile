FROM node:18-alpine

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with increased memory limit
RUN NODE_OPTIONS="--max-old-space-size=6144" npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Build the application with increased memory
RUN NODE_OPTIONS="--max-old-space-size=6144" npm run build

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV PORT=3001
ENV NODE_OPTIONS="--max-old-space-size=6144"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application with unlimited memory
CMD ["sh", "-c", "NODE_OPTIONS='--max-old-space-size=6144' npm start"]