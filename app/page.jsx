"use client";

import { useEffect, useRef, useState } from "react";
import TOLEDCard from "@/components/TOLEDCard";
import Dashboard from "@/components/Dashboard";
import TransactionModal from "@/components/TransactionModal";
import FirmwareUpdate from "@/components/FirmwareUpdate";
import { MecozxCard, CARD_EVENTS } from "@/lib/secureElement";

export default function Home() {
  const cardRef = useRef(null);
  const [mode, setMode] = useState("simulated"); // "simulated" | "webnfc"
  const [cardState, setCardState] = useState("idle");
  const [display, setDisplay] = useState({ line1: "mecozx.", line2: "AWAITING TAP" });
  const [evmAddress, setEvmAddress] = useState(null);
  const [solAddress, setSolAddress] = useState(null);
  const [firmwareVersion, setFirmwareVersion] = useState(null);
  const [showSend, setShowSend] = useState(false);
  const [connectError, setConnectError] = useState(null);

  useEffect(() => {
    const card = new MecozxCard(mode);
    cardRef.current = card;

    const offTap = card.on(CARD_EVENTS.TAP_DETECTED, () => setCardState("connected"));
    const offBio = card.on(CARD_EVENTS.AWAITING_BIOMETRIC, () => setCardState("signing"));
    const offSig = card.on(CARD_EVENTS.SIGNATURE_RELEASED, () => setCardState("connected"));
    const offRej = card.on(CARD_EVENTS.BIOMETRIC_REJECTED, () => setCardState("connected"));
    const offRemove = card.on(CARD_EVENTS.CARD_REMOVED, () => {
      setCardState("idle");
      setEvmAddress(null);
      setSolAddress(null);
    });

    return () => {
      offTap();
      offBio();
      offSig();
      offRej();
      offRemove();
    };
  }, [mode]);

  async function handleTap() {
    setConnectError(null);
    const card = cardRef.current;
    if (!card.isSupported) {
      setConnectError(
        mode === "webnfc"
          ? "Web NFC isn't available here — try Android Chrome over HTTPS, or switch to Simulated."
          : "Card interface unavailable."
      );
      return;
    }
    setCardState("connecting");
    try {
      await card.tap();
      const [addr, sol, fw] = await Promise.all([
        card.getEvmAddress(),
        card.getSolanaPublicKey().catch(() => null),
        card.getFirmwareVersion(),
      ]);
      setEvmAddress(addr);
      setSolAddress(sol);
      setFirmwareVersion(fw);
      await card.pushDisplay({ line1: "CARD READY", line2: addr.slice(0, 6) + "…" + addr.slice(-4) });
      setDisplay({ line1: "CARD READY", line2: addr.slice(0, 6) + "…" + addr.slice(-4) });
    } catch (e) {
      setConnectError(e.message);
      setCardState("idle");
    }
  }

  async function handleRemove() {
    await cardRef.current?.remove();
  }

  const connected = cardState !== "idle" && cardState !== "connecting" && evmAddress;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "28px 18px 60px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 15, opacity: 0.9 }}>
          mecozx. companion
        </span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          style={{
            background: "transparent",
            color: "var(--ink-faint)",
            border: "1px solid var(--panel-border)",
            borderRadius: 8,
            padding: "4px 8px",
            fontSize: 11,
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          <option value="simulated">simulated card</option>
          <option value="webnfc">web nfc (android)</option>
        </select>
      </header>

      <TOLEDCard cardState={cardState} display={display} firmwareVersion={firmwareVersion} />

      <div style={{ display: "flex", gap: 10, marginTop: 20, marginBottom: 24 }}>
        {!connected ? (
          <button
            onClick={handleTap}
            disabled={cardState === "connecting"}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 12,
              border: "none",
              background: "var(--accent)",
              color: "#0a0a0a",
              fontWeight: 600,
              fontSize: 14,
              opacity: cardState === "connecting" ? 0.6 : 1,
            }}
          >
            {cardState === "connecting" ? "Waiting for tap…" : "Tap card to connect"}
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowSend(true)}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                border: "none",
                background: "var(--accent)",
                color: "#0a0a0a",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Send
            </button>
            <button
              onClick={handleRemove}
              style={{
                padding: "14px 18px",
                borderRadius: 12,
                border: "1px solid var(--panel-border)",
                background: "transparent",
                color: "var(--ink-dim)",
                fontSize: 13,
              }}
            >
              Remove card
            </button>
          </>
        )}
      </div>

      {connectError && (
        <div
          style={{
            marginBottom: 20,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(255,103,103,0.1)",
            color: "#ffb0b0",
            fontSize: 12,
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          {connectError}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Dashboard evmAddress={evmAddress} solAddress={solAddress} />
        {connected && (
          <FirmwareUpdate
            card={cardRef.current}
            currentVersion={firmwareVersion}
            onUpdated={setFirmwareVersion}
          />
        )}
      </div>

      {evmAddress && (
        <div
          className="mono"
          style={{ marginTop: 18, fontSize: 11, color: "var(--ink-faint)", wordBreak: "break-all" }}
        >
          {evmAddress}
        </div>
      )}

      {showSend && connected && (
        <TransactionModal
          card={cardRef.current}
          evmAddress={evmAddress}
          onClose={() => setShowSend(false)}
          onSigned={() => {}}
        />
      )}
    </main>
  );
}
