# Development-friendly Dockerfile for Next.js (App Router)
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install system deps required for some node modules (optional)
RUN apk add --no-cache bash git openssh ca-certificates

# Copy only package manifests first for better caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --silent

# Copy app sources
COPY . .

# Ensure Next listens on 0.0.0.0 so the container is reachable from host
ENV HOST=0.0.0.0
ENV PORT=3000

# Ignore local node_modules - they should live in container
VOLUME ["/app/node_modules"]

# Expose Next default port
EXPOSE 3000

# Dev command: pass extra args if needed. Uses host 0.0.0.0 and port 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]
