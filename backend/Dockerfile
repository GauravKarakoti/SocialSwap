# Use Node.js base image with Python support
FROM node:20-bullseye

# Install Python and required dependencies
RUN apt-get update && apt-get install -y python3 python3-pip
RUN pip3 install nltk vaderSentiment

# Download NLTK data for sentiment analysis
RUN python3 -c "import nltk; nltk.download('vader_lexicon')"

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Expose application port
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]