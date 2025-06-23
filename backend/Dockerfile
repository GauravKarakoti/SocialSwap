# Use official Node.js image
FROM node:lts

# Install Python and system dependencies
RUN apt-get update 

# Set working directory
WORKDIR /usr/src/app

# Copy package files first for efficient caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose application port
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]