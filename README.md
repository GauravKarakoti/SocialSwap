# SocialSwap  
*Trade Zora Coins with Social Sentiment & AI Bots*  

## Overview  
SocialSwap merges Zora’s Coins Protocol with social media and AI to automate trading strategies.  

## Features  
- 🤖 **AI Trade Bots**: Set rules based on social sentiment, volume, or trends.  
- 🗣️ **Live Social Feed**: Track Farcaster/X discussions alongside Zora coin charts.  
- 💸 **Referral Earnings**: Earn fees from every bot-executed trade.  

## Setup  
1. Clone the repo:  
   ```bash  
   git clone https://github.com/yourusername/socialswap
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

## Usage
1. Run a Trade Bot:
   ```bash
   npm run bot --strategy=sentiment --coin=$TICKER
   ```
2. Launch Social Dashboard:
   ```bash
   npm run dev
   ```

## Tech Stack
- Zora Coins SDK: For minting, swapping, and referral tracking.
- Gelato Network: Automated transaction execution.
- Farcaster Frames: Embedded trading in social feeds.
