"use client";

import { useState } from "react";
import styles from "./TransactionModal.module.css";
import { EVM_CHAINS } from "@/lib/chains";
import { broadcastEvmTx } from "@/lib/rpc";

// phase: "form" | "pushing" | "awaiting-biometric" | "broadcasting" | "done" | "error"
export default function TransactionModal({ card, evmAddress, onClose, onSigned }) {
  const [chainId, setChainId] = useState(EVM_CHAINS[0].id);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState("form");
  const [errorMsg, setErrorMsg] = useState(null);
  const [txHash, setTxHash] = useState(null);

  const chain = EVM_CHAINS.find((c) => c.id === chainId);
  const canSubmit = to.length > 0 && Number(amount) > 0 && phase === "form";

  async function handleSend() {
    setErrorMsg(null);
    try {
      setPhase("pushing");
      await card.pushDisplay({
        line1: `SEND · ${chain.symbol}`,
        line2: `${amount} → ${to.slice(0, 6)}…${to.slice(-4)}`,
      });

      setPhase("awaiting-biometric");
      const signedRawTx = await card.signEvmTransfer({
        chain,
        fromAddress: evmAddress,
        toAddress: to,
        amountEth: amount,
      });

      setPhase("broadcasting");
      const hash = await broadcastEvmTx(chain.rpcUrl, signedRawTx);
      setTxHash(hash);
      await card.pushDisplay({ line1: "SIGNED", line2: "TX BROADCAST" });
      setPhase("done");
      onSigned?.(hash);
    } catch (e) {
      setErrorMsg(e.message || "Something went wrong");
      setPhase("error");
      await card.pushDisplay({ line1: "SIGNATURE", line2: "NOT RELEASED" }).catch(() => {});
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Send</span>
          <button className={styles.close} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Network</label>
          <select
            className={styles.select}
            value={chainId}
            onChange={(e) => setChainId(e.target.value)}
            disabled={phase !== "form"}
          >
            {EVM_CHAINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Recipient address</label>
          <input
            className={styles.input}
            placeholder="0x…"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={phase !== "form"}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Amount ({chain.symbol})</label>
          <input
            className={styles.input}
            placeholder="0.00"
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={phase !== "form"}
          />
        </div>

        {phase === "form" && (
          <button className={styles.actionBtn} disabled={!canSubmit} onClick={handleSend}>
            Push to card
          </button>
        )}

        {phase === "pushing" && (
          <div className={styles.status}>
            <span className={styles.spinner} />
            Pushing transaction to T-OLED display…
          </div>
        )}

        {phase === "awaiting-biometric" && (
          <div className={styles.status}>
            <span className={styles.spinner} />
            Waiting for fingerprint match on card…
          </div>
        )}

        {phase === "broadcasting" && (
          <div className={styles.status}>
            <span className={styles.spinner} />
            Broadcasting signed transaction…
          </div>
        )}

        {phase === "done" && (
          <div className={`${styles.status} ${styles.success}`}>
            Broadcast ·{" "}
            <a
              className={styles.txLink}
              href={`${chain.explorer}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {txHash?.slice(0, 10)}…
            </a>
          </div>
        )}

        {phase === "error" && (
          <div className={`${styles.status} ${styles.error}`}>{errorMsg}</div>
        )}
      </div>
    </div>
  );
}
