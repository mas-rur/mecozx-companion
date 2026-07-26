// lib/secureElement.js
//
// The single high-level entry point the UI uses. It owns one
// HardwareTransport instance and exposes clean, purpose-named methods
// instead of raw command/payload pairs. Nothing in components/ should
// import a transport directly — only this file does.

import { ethers } from "ethers";
import { CARD_COMMANDS } from "./transport/HardwareTransport";
import { SimulatedTransport } from "./transport/SimulatedTransport";
import { WebNFCTransport } from "./transport/WebNFCTransport";
import { getEvmNonce, getEvmGasPrice } from "./rpc";

export class MecozxCard {
  /**
   * @param {"simulated" | "webnfc"} mode
   */
  constructor(mode = "simulated") {
    this.mode = mode;
    this.transport = mode === "webnfc" ? new WebNFCTransport() : new SimulatedTransport();
  }

  on(event, handler) {
    return this.transport.on(event, handler);
  }

  get isSupported() {
    return this.transport.isSupported;
  }

  async tap() {
    await this.transport.connect();
    await this.transport.send(CARD_COMMANDS.SELECT_APPLET);
  }

  async remove() {
    await this.transport.disconnect();
  }

  async getEvmAddress() {
    const { address } = await this.transport.send(CARD_COMMANDS.GET_PUBLIC_KEY, {
      chainType: "evm",
    });
    return address;
  }

  async getSolanaPublicKey() {
    const { publicKey } = await this.transport.send(CARD_COMMANDS.GET_PUBLIC_KEY, {
      chainType: "solana",
    });
    return publicKey;
  }

  /** Pushes what should render on the T-OLED matrix right now. */
  async pushDisplay({ line1, line2 }) {
    return this.transport.send(CARD_COMMANDS.PUSH_DISPLAY, { line1, line2 });
  }

  async getFirmwareVersion() {
    const { version } = await this.transport.send(CARD_COMMANDS.GET_FIRMWARE_INFO);
    return version;
  }

  async writeFirmwareChunk(data, offset) {
    return this.transport.send(CARD_COMMANDS.OTA_WRITE_CHUNK, { data, offset });
  }

  /**
   * Builds an unsigned EVM transfer, sends it to the card for a
   * biometric-gated signature, and returns the raw signed hex ready
   * to broadcast. The app never sees or handles the private key.
   */
  async signEvmTransfer({ chain, fromAddress, toAddress, amountEth }) {
    const nonce = await getEvmNonce(chain.rpcUrl, fromAddress);
    const gasPrice = await getEvmGasPrice(chain.rpcUrl);

    const unsignedTx = {
      to: toAddress,
      value: ethers.parseEther(String(amountEth)),
      nonce: Number(nonce),
      gasLimit: 21000n,
      gasPrice,
      chainId: chain.chainId,
    };

    const { signedRawTx } = await this.transport.send(CARD_COMMANDS.REQUEST_SIGNATURE, {
      chainType: "evm",
      unsignedTx,
    });
    return signedRawTx;
  }

  async signSolanaMessage(messageHashHex) {
    const { signature } = await this.transport.send(CARD_COMMANDS.REQUEST_SIGNATURE, {
      chainType: "solana",
      messageHash: messageHashHex,
    });
    return signature;
  }
}

export { CARD_EVENTS } from "./transport/HardwareTransport";
