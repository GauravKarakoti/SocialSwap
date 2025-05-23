import { useState } from 'react';
import Dashboard from './components/Dashboard';
import './App.css';
import { tradeCoin, setApiKey } from '@zoralabs/coins-sdk';
import { ethers } from 'ethers';

// Set your Zora API key (required)
setApiKey('YOUR_ZORA_API_KEY');

export const executeSwap = async (ticker, ethAmount) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  return tradeCoin({
    network: 'base-testnet', // Specify network here
    params: {
      ticker,
      ethAmount: ethers.parseEther(ethAmount.toString()),
      direction: 'buy',
      slippage: 1
    },
    signer
  });
};

export default function App() {
  const [walletConnected, setWalletConnected] = useState(false);

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold p-4">SocialSwap</h1>
      <button 
        onClick={async () => {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          setWalletConnected(true);
        }}
        className="btn-primary m-4"
      >
        {walletConnected ? 'Connected ✅' : 'Connect Wallet'}
      </button>
      {walletConnected && <Dashboard />}
    </div>
  );
}