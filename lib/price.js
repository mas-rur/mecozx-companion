// lib/price.js
//
// Millisecond-accurate fiat conversion, per whitepaper section 5.0.
// CoinGecko's free /simple/price endpoint, no key required.

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export async function getPrices(coingeckoIds) {
  const unique = [...new Set(coingeckoIds)];
  const url = `${COINGECKO_BASE}/simple/price?ids=${unique.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  return res.json(); // { ethereum: { usd, usd_24h_change }, ... }
}
