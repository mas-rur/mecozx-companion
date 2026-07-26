// lib/rpc.js
//
// Raw JSON-RPC calls against public endpoints. No SDK, no API key —
// matches the pattern used across the rest of the mecozx / Pay3 codebase.

async function rpcCall(url, method, params = []) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "RPC error");
  return json.result;
}

// --- EVM ---------------------------------------------------------------

export async function getEvmBalance(rpcUrl, address) {
  const hex = await rpcCall(rpcUrl, "eth_getBalance", [address, "latest"]);
  return BigInt(hex);
}

export async function getEvmNonce(rpcUrl, address) {
  const hex = await rpcCall(rpcUrl, "eth_getTransactionCount", [address, "pending"]);
  return BigInt(hex);
}

export async function getEvmGasPrice(rpcUrl) {
  const hex = await rpcCall(rpcUrl, "eth_gasPrice", []);
  return BigInt(hex);
}

// Broadcasts a transaction that was already signed on-card. The app never
// signs anything itself — it only ever forwards the raw signed bytes the
// Secure Element handed back over NFC.
export async function broadcastEvmTx(rpcUrl, signedRawTxHex) {
  return rpcCall(rpcUrl, "eth_sendRawTransaction", [signedRawTxHex]);
}

// --- Solana --------------------------------------------------------------

export async function getSolBalance(rpcUrl, address) {
  const result = await rpcCall(rpcUrl, "getBalance", [address]);
  return BigInt(result?.value ?? 0);
}

export async function broadcastSolTx(rpcUrl, signedTxBase64) {
  return rpcCall(rpcUrl, "sendTransaction", [signedTxBase64, { encoding: "base64" }]);
}
