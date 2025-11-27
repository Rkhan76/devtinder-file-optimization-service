# ------------------------------
# 1. Use Node.js base image
# ------------------------------
FROM node:18-slim

# ------------------------------
# 2. Install dependencies needed for sharp + ffmpeg
# ------------------------------
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    librsvg2-dev \
    libvips-dev \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# ------------------------------
# 3. Create app directory
# ------------------------------
WORKDIR /app

# ------------------------------
# 4. Copy package files first (for cached installs)
# ------------------------------
COPY package*.json ./

# ------------------------------
# 5. Install dependencies
# ------------------------------
RUN npm install --production

# ------------------------------
# 6. Copy the rest of the app
# ------------------------------
COPY . .

# ------------------------------
# 7. Expose port (match your server.js)
# ------------------------------
EXPOSE 4000

# ------------------------------
# 8. Start the service
# ------------------------------
CMD ["npm", "start"]
