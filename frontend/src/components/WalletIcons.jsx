import React from "react";

// MetaMask Icon SVG
export function MetaMaskIcon({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <g>
        <polygon fill="#E2761B" points="27.3,4.6 17.5,12.1 19.3,8.1"/>
        <polygon fill="#E4761B" points="4.7,4.6 12.6,8.2 14.4,12.2"/>
        <polygon fill="#E4761B" points="25.7,22.3 22.9,26.5 26.8,27.6 27.9,22.4"/>
        <polygon fill="#E4761B" points="4.1,22.4 5.2,27.6 9.1,26.5 6.3,22.3"/>
        <polygon fill="#763D16" points="13.9,17.8 14.5,20.1 17.5,20.1 18.2,17.8"/>
        <polygon fill="#F6851B" points="22.9,26.5 18.2,24.2 18.6,27.2 18.6,27.2 26.8,27.6"/>
        <polygon fill="#F6851B" points="9.1,26.5 13.4,27.2 13.4,27.2 13.8,24.2 9.1,26.5"/>
        <polygon fill="#C0AD9E" points="13.6,21.5 13.8,24.2 18.2,24.2 18.4,21.5 17.5,20.1 14.5,20.1"/>
        <polygon fill="#161616" points="18.6,27.2 18.2,24.2 13.8,24.2 13.4,27.2 16,27.8"/>
        <polygon fill="#763D16" points="27.2,16.1 28.1,12.7 24.3,13.1"/>
        <polygon fill="#763D16" points="3.9,12.7 4.8,16.1 7.7,13.1"/>
        <polygon fill="#F6851B" points="7.7,13.1 4.8,16.1 9.1,17.7 9.9,14.3"/>
        <polygon fill="#F6851B" points="24.3,13.1 22.1,14.3 22.9,17.7 27.2,16.1"/>
        <polygon fill="#E4761B" points="9.1,17.7 13.9,17.8 13.9,17.8 12.9,15.1 9.9,14.3"/>
        <polygon fill="#E4761B" points="18.2,17.8 22.9,17.7 22.1,14.3 19.1,15.1"/>
        <polygon fill="#D7C1B3" points="18.2,17.8 17.5,20.1 18.4,21.5 18.2,24.2 22.9,26.5 22.9,17.7"/>
        <polygon fill="#D7C1B3" points="13.9,17.8 9.1,17.7 9.1,26.5 13.8,24.2 13.6,21.5 13.9,17.8"/>
        <polygon fill="#763D16" points="12.9,15.1 13.9,17.8 14.5,20.1 17.5,20.1 18.2,17.8 19.1,15.1"/>
        <polygon fill="#F6851B" points="19.3,8.1 17.5,12.1 20.1,13.2 22.1,14.3 24.3,13.1"/>
        <polygon fill="#F6851B" points="9.9,14.3 12.9,15.1 14.4,12.2 12.6,8.2 7.7,13.1"/>
      </g>
    </svg>
  );
}

// WalletConnect Icon SVG
export function WalletConnectIcon({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none">
      <g>
        <rect width="40" height="40" rx="20" fill="#3B99FC"/>
        <path
          d="M12.1 17.4c4.5-4.2 11.3-4.2 15.8 0l.5.5a1.1 1.1 0 01-.1 1.6 1.1 1.1 0 01-1.6-.1l-.5-.5c-3.6-3.3-9.1-3.3-12.7 0l-.5.5a1.1 1.1 0 01-1.6.1 1.1 1.1 0 01-.1-1.6l.5-.5zm2.5 2.4c3.2-3 8.2-3 11.4 0l.5.5a.8.8 0 01-1.1 1.1l-.5-.5c-2.4-2.2-6.3-2.2-8.7 0l-.5.5a.8.8 0 01-1.1-1.1l.5-.5zm2.5 2.3c1.9-1.8 4.9-1.8 6.7 0l.5.5a.6.6 0 01-.8.8l-.5-.5c-1.2-1.1-3.1-1.1-4.3 0l-.5.5a.6.6 0 01-.8-.8l.5-.5z"
          fill="#fff"
        />
      </g>
    </svg>
  );
}

export default { MetaMaskIcon, WalletConnectIcon };
