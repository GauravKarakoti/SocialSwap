import { useState } from 'react';
import Dashboard from './components/Dashboard';
import './App.css';
import { tradeCoin, setApiKey } from '@zoralabs/coins-sdk';
import { ethers, BrowserProvider } from 'ethers';
import { Button } from "@material-tailwind/react";
import { MetaMaskIcon, WalletConnectIcon } from './components/WalletIcons';

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
    <div className="container mx-auto min-h-screen bg-gradient-to-br from-gray-900 to-blue-900">
      <header className="border-b border-blue-500/20 py-6 px-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          SocialSwap
        </h1>
      </header>

      <main className="p-8 max-w-2xl mx-auto">
        <Button
          onClick={async () => {
            const accounts = await window.ethereum.request({ 
              method: 'eth_requestAccounts' 
            });
            setUserAddress(accounts[0]);
            setWalletConnected(true);
          }}
          variant="gradient"
          color="light-blue"
          className="group relative flex items-center gap-4 py-4 px-8 text-lg font-mono btn-primary"
          fullWidth
        >
          {walletConnected ? (
            <>
              <span className="text-green-400">●</span>
              Connected: {userAddress.slice(0,6)}...{userAddress.slice(-4)}
            </>
          ) : (
            <>
              <MetaMaskIcon className="h-6 w-6" />
              Connect Wallet
              <span className="absolute right-4 opacity-70 group-hover:opacity-100 transition-opacity">
                <WalletConnectIcon className="h-6 w-6" />
              </span>
            </>
          )}
        </Button>

        {walletConnected && <Dashboard userAddress={userAddress} />}
      </main>
    </div>
  );
}