FROM node:16-alpine

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Set proper permissions for files
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Set NODE_ENV to production for better performance
ENV NODE_ENV=production

# Use healthcheck to verify the application is working correctly
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Set security headers in the application
# The application already sets COOP and COEP headers for SharedArrayBuffer support
# These headers are required for FFmpeg.wasm to work properly

# Set the command to start the server
CMD ["node", "server.js"] 