# Use official Node.js image
FROM node:lts

# Install Python and system dependencies
RUN apt-get update && apt-get install -y python3 python3-pip

# Set working directory
WORKDIR /usr/src/app

# Copy package files first for efficient caching
COPY package*.json ./
COPY scripts/requirements.txt ./scripts/

# Install dependencies
RUN npm install
RUN pip3 install -r scripts/requirements.txt

# Copy application files
COPY . .

# Expose application port
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]