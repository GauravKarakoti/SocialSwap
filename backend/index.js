import express from 'express';
import Redis from 'ioredis';
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

let redis;
const REDIS_URL = process.env.REDIS_URL;
try {
  redis = new Redis(REDIS_URL);
  redis.on('error', (err) => {
    console.error('Redis error:', err.message);
  });
  redis.on('connect', () => {
    console.log(`Connected to Redis at ${REDIS_URL}`);
  });
} catch (err) {
  console.log(err);
  console.error('Redis connection failed, using in-memory fallback');
  redis = {
    store: new Map(),
    get: (key) => Promise.resolve(redis.store.get(key)),
    set: (key, val, ...args) => {
      redis.store.set(key, val);
      return Promise.resolve('OK');
    },
    hset: (key, field, value) => {
      if (!redis.store.has(key)) redis.store.set(key, {});
      const obj = redis.store.get(key);
      obj[field] = value;
      return Promise.resolve(1);
    },
    hgetall: (key) => Promise.resolve(redis.store.get(key) || {}),
    keys: (pattern) => Promise.resolve([...redis.store.keys()].filter(k => k.match(pattern)))
  };
}

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
           await redis.hset(key, 'lastExecuted', Date.now());
         }
       }
      } catch (error) {
       console.error('Bot engine error:', error);
     }
   });
  
   async function triggerGelatoSwap(userAddress, ticker, amount) {
    const tokenAddress = "0xA292c308Bf0054c0c8b85bA5872499533343483a";
    const swapParams = {
       network: 'base-testnet',
       params: {
         tokenAddress,
         ethAmount: ethers.parseEther(amount.toString()),
         direction: 'buy',
         slippage: 1
       }
    };
     
     const request = {
       chainId: 8453, // Base mainnet
       target: process.env.ZORA_SWAP_CONTRACT,
       data: tradeCoin.encode(swapParams),
       user: userAddress
     };
     
     try {
      await relay.sponsoredCall(request, process.env.GELATO_API_KEY);
      console.log(`Triggered Gelato swap for ${ticker}`);
    } catch (error) {
      console.error('Gelato error:', error);
    }
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
    if (redis.get) {
      const cached = await redis.get(`sentiment:${req.params.ticker}`);
      if (cached) return res.json({ score: parseFloat(cached) });
    }
       
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