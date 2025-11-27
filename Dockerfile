# -----------------------------
# 1. Builder Stage (Install deps)
# -----------------------------
FROM node:20-bookworm-slim AS builder

# Install system packages needed for sharp
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    librsvg2-dev \
    libvips-dev \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy app source code
COPY . .

# -----------------------------
# 2. Runtime Stage (Lightweight)
# -----------------------------
FROM node:20-bookworm-slim

# Install ONLY what's needed for running ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libvips42 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy the rest of the built app
COPY --from=builder /app .

EXPOSE 4000

CMD ["npm", "start"]
