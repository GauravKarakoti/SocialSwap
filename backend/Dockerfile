# Use official Node.js image
FROM node:18-slim

# Set working directory
WORKDIR /usr/src/app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# Expose your app port
EXPOSE 3000

# Start your Node.js server
CMD ["node", "index.js"]