import express from 'express';
import Redis from 'ioredis';
import { spawn } from 'child_process';
import cors from 'cors';
import 'dotenv/config'; 
import fetch from 'node-fetch';

const app = express();
app.use(cors());
const redis = new Redis();

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
            ticker
            price
            marketCap
            // add more fields you need here…
          }
        }
      `,
      variables: {}
    };

    const graphResponse = await fetch('https://api.zora.co/universal/graphql', {
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

    if (!graphResponse.ok) {
      throw new Error(`Zora GraphQL error: ${text}`);
    }

    const json = JSON.parse(text);
    if (json.errors) {
      throw new Error(`Zora GraphQL returned errors: ${JSON.stringify(json.errors)}`);
    }

    // Assuming the shape is { data: { trendingCoins: [ … ] } }
    const trendingData = json.data.trendingCoins;

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

// Run Python sentiment script on-demand
app.get('/api/sentiment/:ticker', (req, res) => {
  const python = spawn('python', ['scripts/sentiment.py', req.params.ticker]);
  python.stdout.on('data', (score) => res.send({ score }));
});
app.listen(3000, function(err){
  if (err) console.log("Error in server setup")
  console.log("Server listening on Port", 3000);
})