## Redis Setup Instructions

### For Local Development
1. Install Redis:
```bash
# macOS
brew install redis

# Linux
sudo apt-get install redis-server

# Windows (WSL2 recommended)
sudo apt-get install redis-server
```
2. Start Redis service:
```bash
# macOS
brew services start redis

# Linux
sudo service redis-server start
```
3. Verify connection:
```bash
redis-cli ping
# Should respond with: PONG
```

### For Production (Docker)
```bash
docker run -d --name redis \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:7-alpine \
  redis-server --save 60 1 --loglevel warning
```