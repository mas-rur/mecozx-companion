"use client";

import styles from "./TOLEDCard.module.css";

// cardState: "idle" | "connecting" | "connected" | "signing" | "signed"
export default function TOLEDCard({ cardState, display, firmwareVersion }) {
  const stateClass =
    cardState === "connecting"
      ? styles.connecting
      : cardState === "signing"
      ? styles.signing
      : cardState === "idle"
      ? styles.awaiting
      : "";

  return (
    <div className={styles.cardWrap}>
      <div className={`${styles.card} ${stateClass}`}>
        <svg className={styles.circuitLayer} viewBox="0 0 380 240" fill="none">
          <path
            d="M0 40 H120 L140 60 H260 L280 40 H380 M0 90 H60 L80 110 H300 L320 90 H380 M0 160 H160 L180 180 H380 M0 200 H90 L110 220"
            stroke="#67C6FE"
            strokeWidth="0.6"
          />
          <circle cx="140" cy="60" r="2" fill="#67C6FE" />
          <circle cx="280" cy="40" r="2" fill="#67C6FE" />
          <circle cx="180" cy="180" r="2" fill="#67C6FE" />
        </svg>
        <div className={styles.sheen} />

        <div className={styles.content}>
          <div className={styles.topRow}>
            <span className={styles.wordmark}>mecozx.</span>
            <span className={styles.statusDot}>
              <span
                className={`${styles.dot} ${
                  cardState !== "idle" ? styles.live : ""
                }`}
              />
              {cardState === "idle" && "no field"}
              {cardState === "connecting" && "handshake"}
              {cardState === "connected" && "in field"}
              {cardState === "signing" && "biometric"}
              {cardState === "signed" && "released"}
            </span>
          </div>

          <div className={styles.display}>
            <div className={styles.line1}>{display?.line1 ?? "mecozx."}</div>
            <div className={styles.line2}>{display?.line2 ?? "AWAITING TAP"}</div>
          </div>

          <div className={styles.bottomRow}>
            <span>ISO/IEC 7810 · EAL6+</span>
            <span>fw {firmwareVersion ?? "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
