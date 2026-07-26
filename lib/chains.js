// lib/chains.js
//
// Direct public JSON-RPC endpoints only — no Alchemy/Infura style indexer
// keys required, consistent with how the rest of the mecozx / Pay3 stack
// talks to chains.
//
// Every EVM chain here shares ONE secp256k1 keypair held inside the card's
// Secure Element. Solana is kept separate because it needs its own ed25519
// keypair — the Secure Element must derive/store a second key slot for it.

export const EVM_CHAINS = [
  {
    id: "ethereum",
    chainId: 1,
    name: "Ethereum",
    symbol: "ETH",
    coingeckoId: "ethereum",
    rpcUrl: "https://cloudflare-eth.com",
    explorer: "https://etherscan.io",
    decimals: 18,
  },
  {
    id: "base",
    chainId: 8453,
    name: "Base",
    symbol: "ETH",
    coingeckoId: "ethereum",
    rpcUrl: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    decimals: 18,
  },
  {
    id: "polygon",
    chainId: 137,
    name: "Polygon",
    symbol: "POL",
    coingeckoId: "matic-network",
    rpcUrl: "https://polygon-rpc.com",
    explorer: "https://polygonscan.com",
    decimals: 18,
  },
  {
    id: "optimism",
    chainId: 10,
    name: "Optimism",
    symbol: "ETH",
    coingeckoId: "ethereum",
    rpcUrl: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    decimals: 18,
  },
  {
    id: "arbitrum",
    chainId: 42161,
    name: "Arbitrum One",
    symbol: "ETH",
    coingeckoId: "ethereum",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    decimals: 18,
  },
  {
    id: "mantle",
    chainId: 5000,
    name: "Mantle",
    symbol: "MNT",
    coingeckoId: "mantle",
    rpcUrl: "https://rpc.mantle.xyz",
    explorer: "https://mantlescan.xyz",
    decimals: 18,
  },
  {
    id: "zora",
    chainId: 7777777,
    name: "Zora",
    symbol: "ETH",
    coingeckoId: "ethereum",
    rpcUrl: "https://rpc.zora.energy",
    explorer: "https://explorer.zora.energy",
    decimals: 18,
  },
];

export const SOLANA_CHAIN = {
  id: "solana",
  name: "Solana",
  symbol: "SOL",
  coingeckoId: "solana",
  rpcUrl: "https://api.mainnet-beta.solana.com",
  explorer: "https://explorer.solana.com",
  decimals: 9,
};

export const ALL_CHAINS = [...EVM_CHAINS, SOLANA_CHAIN];

export function getChain(id) {
  return ALL_CHAINS.find((c) => c.id === id);
}
