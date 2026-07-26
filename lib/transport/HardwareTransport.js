// lib/transport/HardwareTransport.js
//
// This file defines the wire protocol between the companion app and the
// mecozx card's EAL6+ Secure Element, independent of *how* the bytes
// actually get there. Everything above this layer (Dashboard, tx flow,
// firmware updater) talks only to a HardwareTransport instance and never
// cares whether the underlying channel is a browser API or a native
// NFC stack.
//
// ---------------------------------------------------------------------
// IMPORTANT ARCHITECTURE NOTE — read before wiring up real hardware:
//
// The whitepaper's "encrypted NFC tunnel" and biometric signature release
// imply a real ISO/IEC 7816-4 APDU channel (SELECT, GET DATA, biometric-
// gated INTERNAL AUTHENTICATE, etc.) — the same command set any EAL6+
// smart card / secure element speaks.
//
// Browser Web NFC (the `NDEFReader` API) can only read/write NDEF
// *messages* on a tag. It does not expose ISO-DEP APDU exchange, and it
// does not exist at all on iOS Safari. That means:
//
//   - Web NFC is fine for: pushing a small "wake + display" payload,
//     reading a public NDEF record (e.g. a public key or a session nonce)
//     off the card, kicking off a session.
//   - Web NFC is NOT sufficient for: the actual biometric-gated signing
//     exchange. That needs a native NFC stack — Android `IsoDep`
//     (isoDep.transceive(apdu)) or iOS `CoreNFC`'s
//     `NFCISO7816APDU` / `NFCTagReaderSession` — driven from a native
//     shell (React Native + a native module, or a Capacitor/Expo NFC
//     plugin that exposes raw APDU transceive).
//
// This app is built so that swap-in is a one-file change: implement
// `WebNFCTransport` or a new `NativeBridgeTransport` against the same
// interface below, and nothing in the UI layer changes.
// ---------------------------------------------------------------------

// Command set — mirrors what the physical Secure Element firmware will
// need to expose. Treat these as the APDU INS bytes once real firmware
// exists; for now they're just message-type tags the simulated card
// understands.
export const CARD_COMMANDS = {
  SELECT_APPLET: "SELECT_APPLET",
  GET_PUBLIC_KEY: "GET_PUBLIC_KEY", // { chainType: 'evm' | 'solana' }
  PUSH_DISPLAY: "PUSH_DISPLAY", // what renders on the T-OLED right now
  REQUEST_SIGNATURE: "REQUEST_SIGNATURE", // triggers on-card fingerprint match
  GET_FIRMWARE_INFO: "GET_FIRMWARE_INFO",
  OTA_WRITE_CHUNK: "OTA_WRITE_CHUNK",
};

export const CARD_EVENTS = {
  TAP_DETECTED: "TAP_DETECTED",
  AWAITING_BIOMETRIC: "AWAITING_BIOMETRIC",
  BIOMETRIC_REJECTED: "BIOMETRIC_REJECTED",
  SIGNATURE_RELEASED: "SIGNATURE_RELEASED",
  CARD_REMOVED: "CARD_REMOVED",
};

/**
 * @abstract
 * Base class every transport implementation extends. A transport's only
 * job is moving command/response payloads between the app and whatever
 * is powering the card at that moment (inductive tap window only — the
 * card is dead the instant it leaves the field, per whitepaper 3.2/4.0).
 */
export class HardwareTransport {
  constructor() {
    if (new.target === HardwareTransport) {
      throw new Error("HardwareTransport is abstract — use a concrete implementation");
    }
    this._listeners = new Map();
  }

  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(handler);
    return () => this._listeners.get(event)?.delete(handler);
  }

  emit(event, payload) {
    this._listeners.get(event)?.forEach((h) => h(payload));
  }

  /** Resolves true once a card is in the field and SELECT_APPLET succeeds. */
  async connect() {
    throw new Error("connect() not implemented");
  }

  /** Sends one command, returns the card's response payload. */
  async send(_command, _payload) {
    throw new Error("send() not implemented");
  }

  async disconnect() {
    throw new Error("disconnect() not implemented");
  }

  get isSupported() {
    return false;
  }
}
