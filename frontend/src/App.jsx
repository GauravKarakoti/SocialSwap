import { useState } from 'react';
import Dashboard from './components/Dashboard';
import './App.css';
import { tradeCoin, setApiKey } from '@zoralabs/coins-sdk';
import { ethers, BrowserProvider } from 'ethers';

// Set your Zora API key (required)
setApiKey(import.meta.env.VITE_ZORA_API_KEY);

export const executeSwap = async (ticker, ethAmount) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  return tradeCoin({
    network: 'base-testnet', // Specify network here
    params: {
      tokenAddress: e.currentTarget.dataset.address,
      ethAmount: ethers.parseEther(ethAmount.toString()),
      direction: 'buy',
      slippage: 1
    },
    signer
  });
};

export const getSigner = async () => {
     const provider = new BrowserProvider(window.ethereum);
      return provider.getSigner();
};

export default function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold p-4">SocialSwap</h1>
      <button 
        onClick={async () => {
          const accounts = await window.ethereum.request({ 
           method: 'eth_requestAccounts' 
          });
         setUserAddress(accounts[0]);
         setWalletConnected(true);
        }}
        className="btn-primary m-4"
      >
        {walletConnected ? 'Connected ✅' : 'Connect Wallet'}
      </button>
      {walletConnected && <Dashboard userAddress={userAddress} />}
    </div>
  );
}