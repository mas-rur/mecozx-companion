// lib/transport/SimulatedTransport.js
//
// A fully in-browser stand-in for the physical card. This is what the app
// runs against today, before hardware exists. It deliberately mimics the
// real security boundary: a keypair is generated once inside this
// module's closure and NEVER handed to the caller — only public keys and
// signatures cross the "transport" boundary, exactly like the real
// Secure Element is supposed to behave.
//
// Swap this for WebNFCTransport / a native transport later; the UI layer
// doesn't need to change because both implement HardwareTransport.

import { ethers } from "ethers";
import nacl from "tweetnacl";
import { HardwareTransport, CARD_COMMANDS, CARD_EVENTS } from "./HardwareTransport";

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

export class SimulatedTransport extends HardwareTransport {
  constructor({ failBiometricRate = 0 } = {}) {
    super();
    this._connected = false;
    this._failBiometricRate = failBiometricRate;

    // --- "Secure Element" internal state. Private keys live here only. ---
    this._evmWallet = ethers.Wallet.createRandom();
    this._solKeypair = nacl.sign.keyPair();
    this._firmwareVersion = "1.0.4-sim";
    this._displayState = { line1: "mecozx.", line2: "AWAITING TAP" };
  }

  get isSupported() {
    return true; // simulation always "works"
  }

  async connect() {
    // simulate the inductive-coupling wake-up window
    await delay(400 + Math.random() * 300);
    this._connected = true;
    this.emit(CARD_EVENTS.TAP_DETECTED, { firmware: this._firmwareVersion });
    return true;
  }

  async disconnect() {
    this._connected = false;
    this._displayState = { line1: "mecozx.", line2: "AWAITING TAP" };
    this.emit(CARD_EVENTS.CARD_REMOVED, {});
  }

  async send(command, payload = {}) {
    if (!this._connected) {
      throw new Error("No card in field — tap the card to open a session");
    }

    switch (command) {
      case CARD_COMMANDS.SELECT_APPLET:
        return { ok: true, applet: "mecozx-wallet-v1" };

      case CARD_COMMANDS.GET_PUBLIC_KEY: {
        if (payload.chainType === "solana") {
          return { publicKey: Buffer.from(this._solKeypair.publicKey).toString("hex") };
        }
        return { address: this._evmWallet.address };
      }

      case CARD_COMMANDS.PUSH_DISPLAY: {
        // This is what would actually render on the T-OLED matrix right now.
        this._displayState = payload;
        return { ok: true, rendered: payload };
      }

      case CARD_COMMANDS.GET_FIRMWARE_INFO:
        return { version: this._firmwareVersion };

      case CARD_COMMANDS.OTA_WRITE_CHUNK:
        await delay(30);
        return { ok: true, offset: payload.offset };

      case CARD_COMMANDS.REQUEST_SIGNATURE:
        return this._handleSignatureRequest(payload);

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  async _handleSignatureRequest({ chainType, unsignedTx, messageHash }) {
    this.emit(CARD_EVENTS.AWAITING_BIOMETRIC, {});
    // simulate the time a real fingerprint match takes against the sensor
    await delay(900 + Math.random() * 600);

    if (Math.random() < this._failBiometricRate) {
      this.emit(CARD_EVENTS.BIOMETRIC_REJECTED, {});
      throw new Error("Biometric match failed — signature not released");
    }

    if (chainType === "solana") {
      const msgBytes = Buffer.from(messageHash.replace(/^0x/, ""), "hex");
      const signature = nacl.sign.detached(msgBytes, this._solKeypair.secretKey);
      const sigHex = "0x" + Buffer.from(signature).toString("hex");
      this.emit(CARD_EVENTS.SIGNATURE_RELEASED, {});
      return { signature: sigHex };
    }

    // EVM: sign the fully-formed transaction, return the raw serialized,
    // broadcast-ready hex — the app never touches the key or does signing.
    const signedRawTx = await this._evmWallet.signTransaction(unsignedTx);
    this.emit(CARD_EVENTS.SIGNATURE_RELEASED, {});
    return { signedRawTx };
  }
}
