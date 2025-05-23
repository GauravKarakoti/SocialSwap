import { useEffect, useState } from 'react';
import { executeSwap } from '../App';

export default function Dashboard() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/trends')
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
    if (!window.ethereum) {
      setError('Please install MetaMask');
    }
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="dashboard-grid p-4">
      {trends.map((coin) => (
        <div key={coin.ticker} className="card">
          <h3 className="text-xl font-bold mb-2">{coin.ticker}</h3>
          <p className="mb-2">Price: ${coin.price}</p>
          <p className="mb-4">Market Cap: {coin.marketCap}</p>
          <button
            onClick={() => executeSwap(coin.ticker, 0.01)}
            className="btn-primary"
          >
            Swap 0.01 ETH
          </button>
        </div>
      ))}
    </div>
  );
}
