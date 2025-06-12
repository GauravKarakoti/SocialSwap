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
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
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

// Cache coin trends and sentiment
app.get('/api/trends', async (req, res) => {
  try {
    const cached = await redis.get('trends');
    if (cached) {
      console.log('Returning cached trends');
      return res.json(JSON.parse(cached));
    } 

    console.log('Querying Zora GraphQL for trendingCoins…');
    const graphQLQuery = {
      query: `
        query TrendingCoins {
          trendingCoins {
            token {
             symbol
             address
           }
           price {
             nativePrice {
               value
             }
           }
           marketCap
          }
        }
      `,
      variables: {}
    };

    const response = await fetch('https://api.zora.co/universal/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.ZORA_API_KEY
      },
      body: JSON.stringify(graphQLQuery)
    });

    const text = await response.text(); // safer than json() directly
    console.log("Zora response status:", response.status);
    console.log("Zora response body:", text);

    if (!response.ok) {
      throw new Error(`Zora GraphQL error: ${text}`);
    }

    const json = JSON.parse(text);
    if (json.errors) {
      throw new Error(`Zora GraphQL returned errors: ${JSON.stringify(json.errors)}`);
    }

    // Assuming the shape is { data: { trendingCoins: [ … ] } }
    const trendingData = json.data.trendingCoins.map(coin => ({
      ticker: coin.token.symbol,
      address: coin.token.address,
      price: coin.price?.nativePrice?.value || 0,
      marketCap: coin.marketCap || 0
    }));

    // 3) Cache it for 60 seconds
    await redis.set('trends', JSON.stringify(trendingData), 'EX', 60);

    return res.json({ coins: trendingData });
  } catch (error) {
    console.error('Trends error:', error.message);
    return res
      .status(500)
      .json({ error: error.message || 'Failed to fetch trends', coins: [] });
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