import express from 'express';
import { spawn } from 'child_process';
import cors from 'cors';
import 'dotenv/config'; 
import fetch from 'node-fetch';
import { schedule } from 'node-cron';
import pkg from '@gelatonetwork/relay-sdk';
import { tradeCoin } from '@zoralabs/coins-sdk';
import { ethers } from 'ethers';

const { relay } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// In-memory store implementation
const memoryStore = (() => {
  const store = new Map();          // Main key-value store
  const hashes = new Map();         // Hash structures
  const expirations = new Map();    // Key expiration timestamps
  const timeouts = new Map();       // Timeout references

  return {
    // String operations
    async get(key) {
      if (expirations.has(key) && Date.now() > expirations.get(key)) {
        this.del(key);
        return null;
      }
      return store.get(key) || null;
    },

    async set(key, value, mode, ttl) {
      store.set(key, value);
      
      // Handle expiration
      if (mode === 'EX' && ttl) {
        const expireAt = Date.now() + ttl * 1000;
        expirations.set(key, expireAt);
        
        // Clear existing timeout if any
        if (timeouts.has(key)) clearTimeout(timeouts.get(key));
        
        // Set new timeout
        timeouts.set(key, setTimeout(() => {
          this.del(key);
        }, ttl * 1000));
      }
      return 'OK';
    },

    async del(key) {
      store.delete(key);
      hashes.delete(key);
      expirations.delete(key);
      if (timeouts.has(key)) {
        clearTimeout(timeouts.get(key));
        timeouts.delete(key);
      }
      return 1;
    },

    // Hash operations
    async hset(key, field, value) {
      if (!hashes.has(key)) hashes.set(key, new Map());
      
      const hashMap = hashes.get(key);
      if (typeof field === 'object') {
        // Multi-field set
        let count = 0;
        for (const [f, v] of Object.entries(field)) {
          hashMap.set(f, v);
          count++;
        }
        return count;
      }
      // Single field set
      hashMap.set(field, value);
      return 1;
    },

    async hgetall(key) {
      if (!hashes.has(key)) return {};
      return Object.fromEntries(hashes.get(key));
    },

    // Pattern matching
    async keys(pattern) {
      const regex = new RegExp(
        `^${pattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`
      );
      
      const results = [];
      // Check string keys
      for (const key of store.keys()) {
        if (regex.test(key)) results.push(key);
      }
      // Check hash keys
      for (const key of hashes.keys()) {
        if (regex.test(key) && !results.includes(key)) results.push(key);
      }
      return results;
    }
  };
})();

const redis = memoryStore;

app.get('/api/trends', async (req, res) => {
  try {
    const cached = await redis.get('trends');
    if (cached) {
      console.log('Returning cached trends');
      return res.json(JSON.parse(cached));
    }

    console.log('Fetching trending coins from CoinGecko...');
    const response = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      headers: {
        'x-cg-demo-api-key': process.env.COIN_GECKO_API_KEY
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CoinGecko error: ${response.status} - ${text}`);
    }

    const trendingData = await response.json();
    const coinIds = trendingData.coins.map(coin => coin.item.id);

    // Fetch market data for all trending coins in bulk
    const marketsResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds.join(',')}&order=market_cap_desc`,
      {
        headers: {
          'x-cg-demo-api-key': process.env.COIN_GECKO_API_KEY
        }
      }
    );

    if (!marketsResponse.ok) {
      const text = await marketsResponse.text();
      throw new Error(`CoinGecko markets error: ${marketsResponse.status} - ${text}`);
    }

    const marketsData = await marketsResponse.json();
    const marketMap = new Map(marketsData.map(coin => [coin.id, coin]));

    // Build final coin data with contract addresses and pricing
    const coins = trendingData.coins.map(coin => {
      const marketInfo = marketMap.get(coin.item.id) || {};
      return {
        ticker: coin.item.symbol.toUpperCase(),
        address: coin.item.platforms?.base || null,
        price: marketInfo.current_price || 0,
        marketCap: marketInfo.market_cap || 0
      };
    });

    // Cache for 60 seconds
    await redis.set('trends', JSON.stringify(coins), 'EX', 60);

    return res.json({ coins });
  } catch (error) {
    console.error('Trends error:', error.message);
    return res.status(500).json({
      error: error.message || 'Failed to fetch trends',
      coins: []
    });
  }
});

app.post('/api/bot', async (req, res) => {
     const { userAddress, ticker, condition, amount } = req.body;
     const botKey = `bot:${userAddress}:${ticker}`;
     
     await redis.hset(botKey, {
       condition: JSON.stringify(condition),
       amount,
       active: "true"
     });
     
     return res.status(201).json({ success: true });
   });
  
   // Bot engine - runs every 5 minutes
   schedule('*/5 * * * *', async () => {
     try {
      if (!redis.keys) {
              console.log('Skipping bot engine - no Redis connection');
              return;
      }
      const keys = await redis.keys('bot:*');
      for (const key of keys) {
         const bot = await redis.hgetall(key);
         if (bot.active !== "true") continue;
         
         const [, userAddress, ticker] = key.split(':');
         const sentiment = await getSentiment(ticker);
         const condition = JSON.parse(bot.condition);
         
        if (checkCondition(sentiment, condition)) {
           await triggerGelatoSwap(userAddress, ticker, bot.amount);
           await redis.hSet(key, 'lastExecuted', Date.now());
         }
       }
      } catch (error) {
       console.error('Bot engine error:', error);
     }
   });

   async function getSentiment(ticker) {
    const cacheKey = `sentiment:${ticker}`;
    const cached = await redis.get(cacheKey);
    if (cached) return parseFloat(cached);
    
    try {
      const python = spawn('python', ['scripts/sentiment.py', ticker]);
      let score = 0.5;
      
      python.stdout.on('data', (data) => {
        score = parseFloat(data.toString());
      });
      
      await new Promise((resolve) => python.on('close', resolve));
      await redis.set(cacheKey, score, { EX: 300 }); // 5-min cache
      return score;
    } catch (error) {
      console.error('Sentiment error:', error);
      return 0.5; // Fallback neutral sentiment
    }
   }
  
   async function triggerGelatoSwap(userAddress, ticker, amount) {
    const tokenAddress = await getTokenAddress(ticker);
    if (!tokenAddress) return;
    const swapParams = {
       network: 'base',
       params: {
         tokenAddress,
         ethAmount: ethers.parseEther(amount.toString()),
         direction: 'buy',
         slippage: 0.5
       }
    };
     
     const request = {
       chainId: 8453, // Base mainnet
       target: process.env.ZORA_SWAP_CONTRACT,
       data: tradeCoin.encode(swapParams),
       user: userAddress,
       sponsorApiKey: process.env.GELATO_API_KEY
     };
     
     try {
      const taskId = await relay.sponsoredCall(request);
      console.log(`Triggered Gelato swap for ${ticker}. Task ID: ${taskId}`);
      return taskId;
    } catch (error) {
      console.error('Gelato error:', error);
    }
   }

   async function getTokenAddress(ticker) {
    const cacheKey = `token:${ticker}`;
    const cached = await redis.get(cacheKey);
    if (cached) return cached;
    
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${ticker}`, {
      headers: { 'x-cg-demo-api-key': process.env.COIN_GECKO_API_KEY }
    });
    
    if (response.ok) {
      const data = await response.json();
      const address = data.platforms?.base;
      if (address) {
        await redis.set(cacheKey, address, { EX: 3600 }); // 1-hour cache
        return address;
      }
    }
    return null;
   }
  
   function checkCondition(sentiment, condition) {
     switch (condition.operator) {
       case 'gt': return sentiment > condition.value;
       case 'lt': return sentiment < condition.value;
      case 'gte': return sentiment >= condition.value;
       default: return false;
     }
   }

// Run Python sentiment script on-demand
app.get('/api/sentiment/:ticker', async (req, res) => {
  try {    
    const python = spawn('python', ['scripts/sentiment.py', req.params.ticker]);
    let score = 0.5;
       
    python.stdout.on('data', (data) => {
         score = parseFloat(data.toString());
    });
       
    python.on('close', async () => {
      if (redis.set) {
        await redis.set(`sentiment:${req.params.ticker}`, score, 'EX', 300);
      }
      res.json({ score });
    });
  } catch (error) {
       console.error('Sentiment error:', error);
       res.status(500).json({ error: 'Sentiment analysis failed' });
  }
});
app.listen(3000, function(err){
  if (err) console.log("Error in server setup")
  console.log("Server listening on Port", 3000);
})