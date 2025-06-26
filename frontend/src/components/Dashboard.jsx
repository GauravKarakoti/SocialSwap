import { useEffect, useState } from 'react';
import { executeSwap } from '../App';
import SentimentChart from './SentimentChart';

export default function Dashboard({ userAddress }) {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bots, setBots] = useState([]);
  const [newBot, setNewBot] = useState({ ticker: '', amount: 0.01, condition: 'gt', value: 0.7});
  const [walletConnected, setWalletConnected] = useState(true);
  const [sentimentData, setSentimentData] = useState({});

  useEffect(() => {
    fetch('https://socialswap.onrender.com/api/trends')
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) {
          // If the body is empty or plain text, show status+body
          throw new Error(`API error ${res.status}: ${text}`);
        }
        // Now parse JSON (should have {coins: [ … ] })
        try {
          return JSON.parse(text);
        } catch {
          throw new Error('Received invalid JSON from /api/trends');
        }
      })
      .then((data) => {
        // data.coins is the array from the backend
        setTrends(data.coins || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
       if (walletConnected) {
         fetch(`/api/bot/history?userAddress=${userAddress}`)
           .then(res => res.json())
           .then(data => setBots(data.active));
       }
     }, [walletConnected]);

  const trackSentiment = async (ticker) => {
    const response = await fetch(`/api/sentiment/history?ticker=${ticker}`);
    const data = await response.json();
    setSentimentData(prev => ({
      ...prev,
      [ticker]: data
    }));
  };

  useEffect(() => {
    if (!window.ethereum) {
      setError('Please install MetaMask');
    }
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  const deactivateBot = (botId) => {
    setBots(bots.filter(bot => bot.id !== botId));
    console.log(`Deactivated bot ${botId}`);
  };

  return (
    <div className="p-4">
     <div className="mb-8 p-6 card">
       <h3 className="text-xl font-bold mb-4">Create Trade Bot</h3>
       <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
         <input
           type="text"
           placeholder="Ticker (e.g. DOG)"
           className="p-2 rounded bg-gray-700"
           value={newBot.ticker}
           onChange={(e) => setNewBot({...newBot, ticker: e.target.value})}
         />
         <select
           className="p-2 rounded bg-gray-700"
           value={newBot.condition}
           onChange={(e) => setNewBot({...newBot, condition: e.target.value})}
         >
           <option value="gt">When sentiment &gt;</option>
           <option value="lt">When sentiment &lt;</option>
         </select>
         <input
           type="number"
           step="0.1"
           min="0"
           max="1"
           className="p-2 rounded bg-gray-700"
           value={newBot.value}
           onChange={(e) => setNewBot({...newBot, value: parseFloat(e.target.value)})}
         />
         <button
           className="btn-primary"
           onClick={() => {
             fetch('/api/bot', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 userAddress,
                 ticker: newBot.ticker,
                 amount: newBot.amount,
                 condition: {
                   operator: newBot.condition,
                   value: newBot.value
                 }
               })
             }).then(() => {
               setBots([...bots, {...newBot, id: Date.now()}]);
             });
           }}
         >
           Create Bot
         </button>
       </div>
     </div>

     <div className="mb-8 p-6 card">
        <h3 className="text-xl font-bold mb-4">Bot Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          {bots.map(bot => (
            <div key={bot.id} className="p-4 border rounded-lg border-blue-500/30">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-lg">{bot.ticker} Bot</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={() => deactivateBot(bot.id)}
                    className="px-3 py-1 bg-red-500/20 rounded text-red-400"
                  >
                    Deactivate
                  </button>
                  <button 
                    onClick={() => trackSentiment(bot.ticker)}
                    className="px-3 py-1 bg-blue-500/20 rounded"
                  >
                    Analyze
                  </button>
                </div>
              </div>
              
              {sentimentData[bot.ticker] && (
                <SentimentChart data={sentimentData[bot.ticker]} />
              )}
              
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-gray-400">Executions</p>
                  <p>{bot.executions || 0}</p>
                </div>
                <div>
                  <p className="text-gray-400">Last Triggered</p>
                  <p>{bot.lastExecuted ? 
                    new Date(bot.lastExecuted).toLocaleDateString() : 'Never'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <p className={bot.active ? 'text-green-400' : 'text-red-400'}>
                    {bot.active ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
     </div>
     
     <div className="mb-8">
       <h3 className="text-xl font-bold mb-4">Active Bots</h3>
       {bots.map(bot => (
         <div key={bot.id} className="card p-4 mb-2 flex justify-between items-center">
           <div>
             <span className="font-bold">{bot.ticker}</span>: Buy {bot.amount} ETH 
             when sentiment {bot.condition === 'gt' ? '>' : '<'} {bot.value}
           </div>
           <button 
             className="text-red-500"
             onClick={() => deactivateBot(bot.id)}
           >
             Deactivate
           </button>
         </div>
       ))}
     </div>

      <h2 className="text-xl font-bold mb-4">Trending Coins</h2>
      <div className="dashboard-grid p-4">
        {trends.map((coin) => (
          <div key={coin.ticker} className="card">
            <h3 className="text-xl font-bold mb-2">{coin.ticker}</h3>
            <p className="mb-2">Price: ${coin.price}</p>
            <p className="mb-4">Market Cap: {coin.marketCap}</p>
            <button
              onClick={() => executeSwap(coin.ticker, 0.01)}
              data-address={coin.address}
              className="btn-primary"
            >
              Swap 0.01 ETH
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
