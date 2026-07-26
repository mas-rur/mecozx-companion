// lib/transport/WebNFCTransport.js
//
// Real implementation against the browser Web NFC API (`NDEFReader`).
// Only available on Android Chrome/Edge, over HTTPS, after a user gesture.
//
// What this CAN actually do today:
//   - Detect a tag/card entering the field (reading() event)
//   - Read a public NDEF record off the card (e.g. a public key, a
//     session nonce, a firmware version string)
//   - Write a small NDEF text/uri record to the card (e.g. "wake and
//     show this balance on the T-OLED")
//
// What this CANNOT do, by design of the Web NFC spec:
//   - Send raw ISO 7816-4 APDUs (SELECT, INTERNAL AUTHENTICATE, etc.)
//   - Anything that requires holding an ISO-DEP session open for a
//     challenge/response exchange, which is what biometric-gated signing
//     requires.
//
// So: REQUEST_SIGNATURE below intentionally throws. Wiring that up for
// real needs a native shell — Android `IsoDep.transceive()` or iOS
// `CoreNFC` `NFCISO7816APDU`, most easily reached from a React Native
// module or a Capacitor plugin that exposes raw APDU transceive. Build
// that as `NativeBridgeTransport` against the same HardwareTransport
// interface and nothing else in this app needs to change.

import { HardwareTransport, CARD_COMMANDS, CARD_EVENTS } from "./HardwareTransport";

export class WebNFCTransport extends HardwareTransport {
  constructor() {
    super();
    this._reader = null;
  }

  get isSupported() {
    return typeof window !== "undefined" && "NDEFReader" in window;
  }

  async connect() {
    if (!this.isSupported) {
      throw new Error(
        "Web NFC isn't available in this browser. It only works on Android Chrome/Edge over HTTPS."
      );
    }
    this._reader = new window.NDEFReader();
    await this._reader.scan(); // requires a user gesture (e.g. a "Tap Card" button press)

    this._reader.onreading = (event) => {
      this.emit(CARD_EVENTS.TAP_DETECTED, { serialNumber: event.serialNumber });
    };
    this._reader.onreadingerror = () => {
      this.emit(CARD_EVENTS.CARD_REMOVED, {});
    };

    return true;
  }

  async disconnect() {
    // NDEFReader has no explicit close(); dropping the reference and
    // letting the reading/readingerror handlers go is the accepted pattern.
    this._reader = null;
  }

  async send(command, payload = {}) {
    if (!this._reader) throw new Error("No active NFC session — call connect() first");

    switch (command) {
      case CARD_COMMANDS.PUSH_DISPLAY: {
        const writer = new window.NDEFReader();
        await writer.write({
          records: [{ recordType: "text", data: JSON.stringify(payload) }],
        });
        return { ok: true };
      }

      case CARD_COMMANDS.GET_FIRMWARE_INFO:
      case CARD_COMMANDS.GET_PUBLIC_KEY:
      case CARD_COMMANDS.SELECT_APPLET:
        throw new Error(
          `${command} requires an ISO-DEP APDU exchange, which Web NFC (NDEFReader) doesn't expose. ` +
            "This needs a native NFC bridge — see the note at the top of this file."
        );

      case CARD_COMMANDS.REQUEST_SIGNATURE:
        throw new Error(
          "Biometric-gated signing requires raw APDU transceive over ISO-DEP, which isn't available " +
            "through Web NFC. Implement NativeBridgeTransport (Android IsoDep / iOS CoreNFC) to support this."
        );

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }
}
