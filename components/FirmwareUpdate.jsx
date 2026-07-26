"use client";

import { useState } from "react";
import styles from "./FirmwareUpdate.module.css";

const CHUNK_COUNT = 24;
const LATEST_VERSION = "1.1.0";

export default function FirmwareUpdate({ card, currentVersion, onUpdated }) {
  const [progress, setProgress] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState(null);

  const upToDate = currentVersion === LATEST_VERSION;

  async function handleUpdate() {
    setUpdating(true);
    setNote("Opening encrypted NFC tunnel…");
    try {
      for (let i = 0; i < CHUNK_COUNT; i++) {
        await card.writeFirmwareChunk(`chunk-${i}`, i);
        setProgress(Math.round(((i + 1) / CHUNK_COUNT) * 100));
      }
      setNote(`Firmware ${LATEST_VERSION} installed`);
      onUpdated?.(LATEST_VERSION);
    } catch (e) {
      setNote(e.message || "Update failed — card left the field");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <div>
          <div className={styles.title}>Firmware</div>
          <div className={styles.version}>
            running {currentVersion ?? "—"} {!upToDate && currentVersion && `· ${LATEST_VERSION} available`}
          </div>
        </div>
        <button
          className={styles.btn}
          disabled={!card || updating || upToDate}
          onClick={handleUpdate}
        >
          {updating ? `${progress}%` : upToDate ? "up to date" : "update"}
        </button>
      </div>
      {updating && (
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${progress}%` }} />
        </div>
      )}
      {note && <div className={styles.note}>{note}</div>}
    </div>
  );
}
