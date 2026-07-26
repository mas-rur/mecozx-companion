"use client";

import { useEffect, useState } from "react";
import styles from "./Dashboard.module.css";
import { ALL_CHAINS, EVM_CHAINS, SOLANA_CHAIN } from "@/lib/chains";
import { getEvmBalance, getSolBalance } from "@/lib/rpc";
import { getPrices } from "@/lib/price";
import { ethers } from "ethers";

export default function Dashboard({ evmAddress, solAddress }) {
  const [balances, setBalances] = useState({});
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!evmAddress && !solAddress) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const priceData = await getPrices(ALL_CHAINS.map((c) => c.coingeckoId));
        if (!cancelled) setPrices(priceData);

        const results = {};

        if (evmAddress) {
          await Promise.all(
            EVM_CHAINS.map(async (chain) => {
              try {
                const raw = await getEvmBalance(chain.rpcUrl, evmAddress);
                results[chain.id] = Number(ethers.formatEther(raw));
              } catch {
                results[chain.id] = null; // RPC hiccup — show gracefully, don't break the row
              }
            })
          );
        }

        if (solAddress) {
          try {
            const raw = await getSolBalance(SOLANA_CHAIN.rpcUrl, solAddress);
            results[SOLANA_CHAIN.id] = Number(raw) / 1e9;
          } catch {
            results[SOLANA_CHAIN.id] = null;
          }
        }

        if (!cancelled) setBalances(results);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [evmAddress, solAddress]);

  const chains = ALL_CHAINS.filter((c) => (c.id === "solana" ? solAddress : evmAddress));

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Assets</span>
        <span className={styles.panelMeta}>
          {loading ? "syncing…" : error ? "rpc error" : "live · coingecko"}
        </span>
      </div>

      {!evmAddress && !solAddress && (
        <div className={styles.row}>
          <span className={styles.skeleton}>Tap the card to load balances</span>
        </div>
      )}

      {chains.map((chain) => {
        const bal = balances[chain.id];
        const price = prices[chain.coingeckoId];
        const usdValue = bal != null && price ? bal * price.usd : null;

        return (
          <div className={styles.row} key={chain.id}>
            <div className={styles.rowLeft}>
              <span className={styles.chainDot} />
              <div>
                <div className={styles.chainName}>{chain.name}</div>
                <div className={styles.chainSymbol}>{chain.symbol}</div>
              </div>
            </div>
            <div className={styles.rowRight}>
              <div className={styles.balance}>
                {bal != null ? bal.toFixed(5) : "—"} {chain.symbol}
              </div>
              <div className={styles.balanceUsd}>
                {usdValue != null ? `$${usdValue.toFixed(2)}` : "—"}
                {price?.usd_24h_change != null && (
                  <span
                    className={`${styles.change} ${
                      price.usd_24h_change >= 0 ? styles.changeUp : styles.changeDown
                    }`}
                  >
                    {" "}
                    {price.usd_24h_change >= 0 ? "+" : ""}
                    {price.usd_24h_change.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
