FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV REDIS_URL=redis://redis:6379
ENV PORT=3000

EXPOSE 3000
CMD ["node", "index.js"]